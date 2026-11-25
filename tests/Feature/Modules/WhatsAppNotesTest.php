<?php

declare(strict_types=1);

namespace Tests\Feature\Modules;

use App\Models\Booking;
use App\Models\Employee;
use App\Models\Lead;
use App\Models\LeadNote;
use App\Modules\WhatsApp\Models\WhatsAppConversation;
use App\Modules\WhatsApp\Models\WhatsAppMessage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class WhatsAppNotesTest extends TestCase
{
    use RefreshDatabase;

    private Employee $admin;

    private Employee $sales;

    protected function setUp(): void
    {
        parent::setUp();
        Http::preventStrayRequests();

        Permission::findOrCreate('manage-leads', 'employee');
        $this->admin = Employee::factory()->admin()->create();
        $this->sales = Employee::factory()->create();
        $this->sales->givePermissionTo('manage-leads');
    }

    public function test_note_on_conversation_without_lead_registers_the_customer(): void
    {
        $conversation = WhatsAppConversation::create(['phone' => '966551234567', 'name' => 'محمد', 'assigned_to' => $this->sales->id]);

        $this->actingAs($this->sales, 'employee')
            ->postJson(route('api.v1.whatsapp.conversations.notes.store', $conversation), ['body' => 'مهتم بكامري تمويل'])
            ->assertCreated()
            ->assertJsonPath('data.source', 'whatsapp')
            ->assertJsonPath('data.notable_type', WhatsAppConversation::MORPH_ALIAS)
            ->assertJsonPath('data.notable_id', $conversation->id);

        $lead = Lead::query()->sole();
        $this->assertSame('محمد', $lead->client_name);
        $this->assertSame('966551234567', $lead->client_phone);
        $this->assertSame($this->sales->id, (int) $lead->assigned_to, 'the conversation owner keeps the new lead');
        $this->assertSame($lead->id, $conversation->fresh()->lead_id);
        $this->assertSame('مهتم بكامري تمويل', $lead->notes()->sole()->body);
    }

    public function test_note_on_a_message_uses_the_existing_lead(): void
    {
        $lead = Lead::factory()->assignedTo($this->sales)->create(['client_phone' => '0551234567']);
        $conversation = WhatsAppConversation::create(['phone' => '966551234567', 'assigned_to' => $this->sales->id]);
        $message = $conversation->messages()->create(['direction' => 'in', 'provider' => 'meta', 'body' => 'كم القسط؟', 'status' => 'received']);

        $this->actingAs($this->sales, 'employee')
            ->postJson(route('api.v1.whatsapp.conversations.notes.store', $conversation), ['body' => 'أرسلت له العرض', 'message_id' => $message->id])
            ->assertCreated()
            ->assertJsonPath('data.notable_type', WhatsAppMessage::MORPH_ALIAS)
            ->assertJsonPath('data.notable_id', $message->id);

        $this->assertSame(1, Lead::query()->count());
        $this->assertSame($lead->id, $conversation->fresh()->lead_id);
    }

    public function test_message_of_another_conversation_is_rejected(): void
    {
        $conversation = WhatsAppConversation::create(['phone' => '966551234567']);
        $other = WhatsAppConversation::create(['phone' => '966559999999']);
        $foreignMessage = $other->messages()->create(['direction' => 'in', 'provider' => 'meta', 'body' => 'x', 'status' => 'received']);

        $this->actingAs($this->admin, 'employee')
            ->postJson(route('api.v1.whatsapp.conversations.notes.store', $conversation), ['body' => 'x', 'message_id' => $foreignMessage->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('message_id');
    }

    public function test_sales_cannot_note_conversations_of_others(): void
    {
        $foreign = WhatsAppConversation::create(['phone' => '966551234567', 'assigned_to' => Employee::factory()->create()->id]);

        $this->actingAs($this->sales, 'employee')
            ->postJson(route('api.v1.whatsapp.conversations.notes.store', $foreign), ['body' => 'x'])
            ->assertNotFound();

        $this->assertDatabaseCount('leads', 0);
    }

    public function test_thread_returns_customer_card_and_all_lead_notes(): void
    {
        $lead = Lead::factory()->create(['client_phone' => '0551234567', 'client_name' => 'سارة']);
        Booking::factory()->create(['client_phone' => '966551234567']);
        LeadNote::factory()->for($lead)->create(['body' => 'ملاحظة من الـ CRM']);
        $conversation = WhatsAppConversation::create(['phone' => '966551234567', 'lead_id' => $lead->id]);

        $this->actingAs($this->admin, 'employee')
            ->getJson(route('api.v1.whatsapp.conversations.show', $conversation))
            ->assertOk()
            ->assertJsonPath('data.customer.lead_id', $lead->id)
            ->assertJsonPath('data.customer.name', 'سارة')
            ->assertJsonCount(1, 'data.customer.bookings')
            ->assertJsonPath('data.notes.0.body', 'ملاحظة من الـ CRM');
    }

    public function test_thread_without_lead_has_no_customer(): void
    {
        $conversation = WhatsAppConversation::create(['phone' => '966551234567']);

        $this->actingAs($this->admin, 'employee')
            ->getJson(route('api.v1.whatsapp.conversations.show', $conversation))
            ->assertOk()
            ->assertJsonPath('data.customer', null)
            ->assertJsonPath('data.notes', []);
    }

    public function test_note_on_new_phone_number_creates_lead_owned_by_the_author(): void
    {
        $this->actingAs($this->sales, 'employee')
            ->postJson(route('api.v1.whatsapp.contacts.notes.store'), ['phone' => '0551234567', 'name' => 'خالد', 'body' => 'كلمني من رقم المعرض'])
            ->assertCreated()
            ->assertJsonPath('data.lead_created', true)
            ->assertJsonPath('data.note.body', 'كلمني من رقم المعرض');

        $lead = Lead::query()->sole();
        $this->assertSame('خالد', $lead->client_name);
        $this->assertSame($this->sales->id, (int) $lead->assigned_to);
    }

    public function test_note_on_known_phone_goes_to_its_lead_and_links_the_conversation(): void
    {
        $lead = Lead::factory()->create(['client_phone' => '0551234567']);
        $conversation = WhatsAppConversation::create(['phone' => '966551234567']);

        $this->actingAs($this->admin, 'employee')
            ->postJson(route('api.v1.whatsapp.contacts.notes.store'), ['phone' => '+966 55 123 4567', 'body' => 'عميل قديم'])
            ->assertCreated()
            ->assertJsonPath('data.lead_created', false)
            ->assertJsonPath('data.lead_id', $lead->id)
            ->assertJsonPath('data.note.notable_id', $conversation->id);

        $this->assertSame($lead->id, $conversation->fresh()->lead_id);
    }

    public function test_sales_cannot_note_a_number_owned_by_someone_else(): void
    {
        Lead::factory()->assignedTo(Employee::factory()->create())->create(['client_phone' => '0551234567']);

        $this->actingAs($this->sales, 'employee')
            ->postJson(route('api.v1.whatsapp.contacts.notes.store'), ['phone' => '0551234567', 'body' => 'x'])
            ->assertForbidden();

        $this->assertDatabaseCount('lead_notes', 0);
    }

    public function test_employee_without_lead_permission_cannot_register_a_number(): void
    {
        $this->actingAs(Employee::factory()->create(), 'employee')
            ->postJson(route('api.v1.whatsapp.contacts.notes.store'), ['phone' => '0551234567', 'body' => 'x'])
            ->assertForbidden();

        $this->assertDatabaseCount('leads', 0);
    }

    public function test_only_author_or_admin_deletes_a_conversation_note(): void
    {
        $lead = Lead::factory()->assignedTo($this->sales)->create(['client_phone' => '0551234567']);
        $conversation = WhatsAppConversation::create(['phone' => '966551234567', 'lead_id' => $lead->id, 'assigned_to' => $this->sales->id]);
        $foreignNote = LeadNote::factory()->for($lead)->create();
        $ownNote = LeadNote::factory()->for($lead)->create(['employee_id' => $this->sales->id]);
        $otherLeadNote = LeadNote::factory()->create();

        $this->actingAs($this->sales, 'employee')->deleteJson(route('api.v1.whatsapp.conversations.notes.destroy', [$conversation, $foreignNote]))->assertForbidden();
        $this->actingAs($this->sales, 'employee')->deleteJson(route('api.v1.whatsapp.conversations.notes.destroy', [$conversation, $otherLeadNote]))->assertNotFound();
        $this->actingAs($this->sales, 'employee')->deleteJson(route('api.v1.whatsapp.conversations.notes.destroy', [$conversation, $ownNote]))->assertOk();

        $this->assertModelMissing($ownNote);
        $this->assertModelExists($foreignNote);
    }
}
