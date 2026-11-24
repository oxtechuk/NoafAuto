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

    public function test_dashboard_stats_breakdown_by_status(): void
    {
        foreach (['new', 'contacted', 'pending', 'sold', 'done', 'lost_price', 'rejected'] as $status) {
            Booking::factory()->create(['assigned_to' => $this->sales->id, 'status' => $status, 'net_commission' => 1000]);
        }

        Task::factory()->create(['assigned_to' => $this->sales->id, 'due_date' => today()->toDateString(), 'status' => 'new']);
        Task::factory()->create(['assigned_to' => $this->sales->id, 'due_date' => today()->subDays(3)->toDateString(), 'status' => 'new']);
        Task::factory()->create(['assigned_to' => $this->sales->id, 'due_date' => today()->subDays(3)->toDateString(), 'status' => 'done']);

        $this->actingAs($this->admin, 'employee')
            ->getJson(route('api.v1.dashboard.stats'))
            ->assertOk()
            ->assertJsonPath('data.bookings.total', 7)
            ->assertJsonPath('data.bookings.active', 2)
            ->assertJsonPath('data.bookings.pending', 1)
            ->assertJsonPath('data.bookings.completed', 2)
            ->assertJsonPath('data.bookings.closed', 2)
            ->assertJsonPath('data.bookings.total_commission', 2000)
            ->assertJsonPath('data.tasks.total', 3)
            ->assertJsonPath('data.tasks.today', 1)
            ->assertJsonPath('data.tasks.overdue', 1)
            ->assertJsonPath('data.tasks.done', 1);
    }

    public function test_dashboard_stats_are_zero_when_empty(): void
    {
        $this->actingAs($this->admin, 'employee')
            ->getJson(route('api.v1.dashboard.stats'))
            ->assertOk()
            ->assertJsonPath('data.bookings.total', 0)
            ->assertJsonPath('data.bookings.active', 0)
            ->assertJsonPath('data.bookings.total_commission', 0)
            ->assertJsonPath('data.leads.new', 0)
            ->assertJsonPath('data.tasks.overdue', 0);
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
