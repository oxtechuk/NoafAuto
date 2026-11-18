<?php

namespace Tests\Feature\Api\V1;

use App\Jobs\SendWhatsAppCampaignMessage;
use App\Models\ContactSource;
use App\Models\Employee;
use App\Models\Lead;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class LeadApiTest extends TestCase
{
    use RefreshDatabase;

    private Employee $admin;

    private Employee $sales;

    private Employee $otherSales;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::findOrCreate('manage-leads', 'employee');

        $this->admin = Employee::factory()->admin()->create();
        $this->sales = Employee::factory()->create();
        $this->sales->givePermissionTo('manage-leads');
        $this->otherSales = Employee::factory()->create();
        $this->otherSales->givePermissionTo('manage-leads');
    }

    public function test_guest_cannot_list_leads(): void
    {
        $this->getJson(route('api.v1.leads.index'))->assertUnauthorized();
    }

    public function test_employee_without_permission_cannot_list_leads(): void
    {
        $this->actingAs(Employee::factory()->create(), 'employee')
            ->getJson(route('api.v1.leads.index'))
            ->assertForbidden();
    }

    public function test_admin_lists_all_leads_paginated(): void
    {
        Lead::factory()->count(3)->assignedTo($this->sales)->create();
        Lead::factory()->count(2)->assignedTo($this->otherSales)->create();

        $this->actingAs($this->admin, 'employee')
            ->getJson(route('api.v1.leads.index', ['per_page' => 2]))
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.total', 5)
            ->assertJsonPath('meta.per_page', 2)
            ->assertJsonStructure(['data' => [['id', 'client_name', 'status', 'status_label', 'contact_source', 'assigned_to', 'orders_count']]]);
    }

    public function test_sales_employee_only_lists_own_leads(): void
    {
        $own = Lead::factory()->assignedTo($this->sales)->create();
        Lead::factory()->assignedTo($this->otherSales)->create();

        $this->actingAs($this->sales, 'employee')
            ->getJson(route('api.v1.leads.index'))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $own->id);
    }

    public function test_leads_can_be_searched(): void
    {
        Lead::factory()->create(['client_name' => 'Khalid Alharbi']);
        Lead::factory()->create(['client_name' => 'Noura Alqahtani']);

        $this->actingAs($this->admin, 'employee')
            ->getJson(route('api.v1.leads.index', ['search' => 'Khalid']))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.client_name', 'Khalid Alharbi');
    }

    public function test_per_page_is_capped(): void
    {
        $this->actingAs($this->admin, 'employee')
            ->getJson(route('api.v1.leads.index', ['per_page' => 5000]))
            ->assertOk()
            ->assertJsonPath('meta.per_page', 100);
    }

    public function test_sales_employee_can_view_own_lead(): void
    {
        $lead = Lead::factory()->assignedTo($this->sales)->create();

        $this->actingAs($this->sales, 'employee')
            ->getJson(route('api.v1.leads.show', $lead))
            ->assertOk()
            ->assertJsonPath('data.id', $lead->id);
    }

    public function test_sales_employee_cannot_view_another_employees_lead(): void
    {
        $lead = Lead::factory()->assignedTo($this->otherSales)->create();

        $this->actingAs($this->sales, 'employee')
            ->getJson(route('api.v1.leads.show', $lead))
            ->assertForbidden();
    }

    public function test_missing_lead_returns_404(): void
    {
        $this->actingAs($this->admin, 'employee')
            ->getJson(route('api.v1.leads.show', 999999))
            ->assertNotFound();
    }

    public function test_employee_can_create_lead(): void
    {
        $source = ContactSource::factory()->create();

        $this->actingAs($this->sales, 'employee')
            ->postJson(route('api.v1.leads.store'), [
                'client_name' => 'Fahad',
                'client_phone' => '0551234567',
                'contact_source_id' => $source->id,
                'status' => 'new',
                'started_at' => '2026-11-01',
                'assigned_to' => $this->sales->id,
            ])
            ->assertCreated()
            ->assertJsonPath('data.client_name', 'Fahad')
            ->assertJsonPath('data.client_phone', '966551234567');

        $this->assertDatabaseHas('leads', ['client_name' => 'Fahad', 'assigned_to' => $this->sales->id]);
    }

    public function test_creating_lead_validates_input(): void
    {
        $this->actingAs($this->sales, 'employee')
            ->postJson(route('api.v1.leads.store'), ['status' => 'not-a-status'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['client_name', 'contact_source_id', 'status', 'started_at']);
    }

    public function test_sales_employee_can_update_own_lead(): void
    {
        $lead = Lead::factory()->assignedTo($this->sales)->create();

        $this->actingAs($this->sales, 'employee')
            ->putJson(route('api.v1.leads.update', $lead), [
                'client_name' => 'Updated Name',
                'contact_source_id' => $lead->contact_source_id,
                'status' => 'contacted',
                'started_at' => '2026-11-02',
                'assigned_to' => $this->sales->id,
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'contacted');

        $this->assertSame('Updated Name', $lead->fresh()->client_name);
    }

    public function test_sales_employee_cannot_update_another_employees_lead(): void
    {
        $lead = Lead::factory()->assignedTo($this->otherSales)->create();

        $this->actingAs($this->sales, 'employee')
            ->putJson(route('api.v1.leads.update', $lead), [
                'client_name' => 'Hijacked',
                'contact_source_id' => $lead->contact_source_id,
                'status' => 'new',
                'started_at' => '2026-11-02',
            ])
            ->assertForbidden();

        $this->assertNotSame('Hijacked', $lead->fresh()->client_name);
    }

    public function test_only_admin_can_delete_lead(): void
    {
        $lead = Lead::factory()->assignedTo($this->sales)->create();

        $this->actingAs($this->sales, 'employee')
            ->deleteJson(route('api.v1.leads.destroy', $lead))
            ->assertForbidden();

        $this->actingAs($this->admin, 'employee')
            ->deleteJson(route('api.v1.leads.destroy', $lead))
            ->assertOk();

        $this->assertModelMissing($lead);
    }

    public function test_deactivated_employee_session_is_terminated(): void
    {
        $this->sales->update(['is_active' => false]);

        $this->actingAs($this->sales, 'employee')
            ->getJson(route('api.v1.leads.index'))
            ->assertUnauthorized();

        $this->assertGuest('employee');
    }

    public function test_crm_sales_employee_cannot_open_another_employees_lead(): void
    {
        $lead = Lead::factory()->assignedTo($this->otherSales)->create();

        $this->actingAs($this->sales, 'employee')
            ->get(route('crm.leads.show', $lead))
            ->assertForbidden();
    }

    public function test_crm_whatsapp_campaign_only_targets_the_sales_employees_own_leads(): void
    {
        Queue::fake();
        $own = Lead::factory()->assignedTo($this->sales)->create();
        $others = Lead::factory()->count(3)->assignedTo($this->otherSales)->create();

        $this->actingAs($this->sales, 'employee')
            ->postJson(route('crm.leads.whatsapp-campaign'), ['message' => 'Hi', 'target_all_filtered' => true])
            ->assertOk()
            ->assertJsonPath('total', 1);

        $this->actingAs($this->sales, 'employee')
            ->postJson(route('crm.leads.whatsapp-campaign'), ['message' => 'Hi', 'lead_ids' => $others->pluck('id')->all()])
            ->assertUnprocessable();

        Queue::assertPushed(SendWhatsAppCampaignMessage::class, 1);
        Queue::assertPushed(SendWhatsAppCampaignMessage::class, fn ($job) => $job->leadId === $own->id);
    }

    public function test_crm_deactivated_employee_is_logged_out(): void
    {
        $this->sales->update(['is_active' => false]);

        $this->actingAs($this->sales, 'employee')
            ->get(route('crm.leads.index'))
            ->assertRedirect(route('crm.login'));

        $this->assertGuest('employee');
    }
}
