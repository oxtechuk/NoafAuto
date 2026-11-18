<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Models\Booking;
use App\Models\Employee;
use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class DashboardApiTest extends TestCase
{
    use RefreshDatabase;

    private Employee $admin;

    private Employee $sales;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::findOrCreate('manage-dashboard', 'employee');

        $this->admin = Employee::factory()->admin()->create();

        $this->sales = Employee::factory()->create();
        $this->sales->givePermissionTo('manage-dashboard');
    }

    public function test_guest_cannot_access_dashboard(): void
    {
        $this->getJson(route('api.v1.dashboard.stats'))->assertUnauthorized();
        $this->getJson(route('api.v1.dashboard.alerts'))->assertUnauthorized();
    }

    public function test_employee_without_permission_cannot_access_dashboard(): void
    {
        $unauthorizedEmployee = Employee::factory()->create();

        $this->actingAs($unauthorizedEmployee, 'employee')
            ->getJson(route('api.v1.dashboard.stats'))
            ->assertForbidden();
    }

    public function test_admin_retrieves_dashboard_stats(): void
    {
        Booking::factory()->create(['assigned_to' => $this->sales->id, 'status' => 'new']);
        Task::factory()->create(['assigned_to' => $this->sales->id, 'due_date' => today()->toDateString(), 'status' => 'new']);

        $this->actingAs($this->admin, 'employee')
            ->getJson(route('api.v1.dashboard.stats'))
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.bookings.total', 1)
            ->assertJsonPath('data.leads.total', 1)
            ->assertJsonPath('data.tasks.total', 1);
    }

    public function test_sales_employee_sees_only_own_stats(): void
    {
        $otherSales = Employee::factory()->create();

        // Own booking
        Booking::factory()->create(['assigned_to' => $this->sales->id, 'status' => 'new']);
        // Other's booking
        Booking::factory()->create(['assigned_to' => $otherSales->id, 'status' => 'new']);

        $this->actingAs($this->sales, 'employee')
            ->getJson(route('api.v1.dashboard.stats'))
            ->assertOk()
            ->assertJsonPath('data.bookings.total', 1);
    }

    public function test_dashboard_alerts(): void
    {
        // Overdue task
        Task::factory()->create([
            'assigned_to' => $this->sales->id,
            'due_date' => today()->subDays(2)->toDateString(),
            'status' => 'new',
        ]);

        $this->actingAs($this->sales, 'employee')
            ->getJson(route('api.v1.dashboard.alerts'))
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(1, 'data.overdue_tasks');
    }
}
