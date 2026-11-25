<?php

namespace Tests\Feature\Api\V1;

use App\Models\Employee;
use App\Models\Lead;
use App\Models\LeadNote;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class LeadNoteApiTest extends TestCase
{
    use RefreshDatabase;

    private Employee $sales;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::findOrCreate('manage-leads', 'employee');
        $this->sales = Employee::factory()->create();
        $this->sales->givePermissionTo('manage-leads');
    }

    public function test_owner_adds_and_lists_notes_on_their_lead(): void
    {
        $lead = Lead::factory()->assignedTo($this->sales)->create();
        LeadNote::factory()->for($lead)->create(['body' => 'older']);

        $this->actingAs($this->sales, 'employee')
            ->postJson(route('api.v1.leads.notes.store', $lead), ['body' => 'اتصل بعد العيد'])
            ->assertCreated()
            ->assertJsonPath('data.body', 'اتصل بعد العيد')
            ->assertJsonPath('data.employee_id', $this->sales->id)
            ->assertJsonPath('data.source', 'manual');

        $this->actingAs($this->sales, 'employee')
            ->getJson(route('api.v1.leads.notes.index', $lead))
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.body', 'اتصل بعد العيد');
    }

    public function test_note_body_is_required(): void
    {
        $lead = Lead::factory()->assignedTo($this->sales)->create();

        $this->actingAs($this->sales, 'employee')
            ->postJson(route('api.v1.leads.notes.store', $lead), ['body' => ''])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('body');
    }

    public function test_sales_cannot_read_or_write_notes_on_someone_elses_lead(): void
    {
        $lead = Lead::factory()->assignedTo(Employee::factory()->create())->create();

        $this->actingAs($this->sales, 'employee')->getJson(route('api.v1.leads.notes.index', $lead))->assertForbidden();
        $this->actingAs($this->sales, 'employee')->postJson(route('api.v1.leads.notes.store', $lead), ['body' => 'x'])->assertForbidden();
    }

    public function test_only_author_or_admin_can_delete_a_note(): void
    {
        $lead = Lead::factory()->assignedTo($this->sales)->create();
        $foreignNote = LeadNote::factory()->for($lead)->create();
        $ownNote = LeadNote::factory()->for($lead)->create(['employee_id' => $this->sales->id]);

        $this->actingAs($this->sales, 'employee')->deleteJson(route('api.v1.leads.notes.destroy', [$lead, $foreignNote]))->assertForbidden();
        $this->actingAs($this->sales, 'employee')->deleteJson(route('api.v1.leads.notes.destroy', [$lead, $ownNote]))->assertOk();

        $this->actingAs(Employee::factory()->admin()->create(), 'employee')
            ->deleteJson(route('api.v1.leads.notes.destroy', [$lead, $foreignNote]))
            ->assertOk();

        $this->assertDatabaseCount('lead_notes', 0);
    }

    public function test_note_of_another_lead_is_not_found(): void
    {
        $lead = Lead::factory()->assignedTo($this->sales)->create();
        $note = LeadNote::factory()->create(['employee_id' => $this->sales->id]);

        $this->actingAs($this->sales, 'employee')
            ->deleteJson(route('api.v1.leads.notes.destroy', [$lead, $note]))
            ->assertNotFound();
    }
}
