<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Models\Booking;
use App\Models\Employee;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class ReportApiTest extends TestCase
{
    use RefreshDatabase;

    private Employee $admin;

    private Employee $sales;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::findOrCreate('manage-reports', 'employee');

        $this->admin = Employee::factory()->admin()->create();

        $this->sales = Employee::factory()->create();
        $this->sales->givePermissionTo('manage-reports');
    }

    public function test_guest_cannot_access_reports(): void
    {
        $this->getJson(route('api.v1.reports.bookings'))->assertUnauthorized();
        $this->getJson(route('api.v1.reports.sources'))->assertUnauthorized();
    }

    public function test_employee_without_permission_cannot_access_reports(): void
    {
        $unauthorizedEmployee = Employee::factory()->create();

        $this->actingAs($unauthorizedEmployee, 'employee')
            ->getJson(route('api.v1.reports.bookings'))
            ->assertForbidden();
    }

    public function test_admin_retrieves_booking_financial_and_performance_report(): void
    {
        Booking::factory()->create([
            'status' => 'sold',
            'down_payment' => 20000,
            'duration_years' => 5,
            'monthly_installment' => 3000,
            'assigned_to' => $this->sales->id,
        ]);

        $this->actingAs($this->admin, 'employee')
            ->getJson(route('api.v1.reports.bookings'))
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.financial.total_bookings', 1)
            ->assertJsonPath('data.financial.total_sold', 1)
            ->assertJsonPath('data.financial.total_down_payment', 20000);
    }

    public function test_admin_retrieves_sources_attribution_report(): void
    {
        Booking::factory()->create([
            'utm_source' => 'instagram',
            'utm_medium' => 'cpc',
            'status' => 'sold',
        ]);

        $response = $this->actingAs($this->admin, 'employee')
            ->getJson(route('api.v1.reports.sources'))
            ->assertOk()
            ->assertJsonPath('success', true);

        $channels = collect($response->json('data.channels'));
        $meta = $channels->firstWhere('channel', 'Meta (Instagram / Facebook)');
        $this->assertNotNull($meta);
        $this->assertSame(1, $meta['bookings_count']);
    }
}
