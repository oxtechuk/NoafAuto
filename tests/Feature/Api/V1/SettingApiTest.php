<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Models\Employee;
use App\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class SettingApiTest extends TestCase
{
    use RefreshDatabase;

    private Employee $admin;

    private Employee $sales;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::findOrCreate('manage-settings', 'employee');

        $this->admin = Employee::factory()->admin()->create();

        $this->sales = Employee::factory()->create();
        $this->sales->givePermissionTo('manage-settings');
    }

    public function test_guest_cannot_access_settings(): void
    {
        $this->getJson(route('api.v1.settings.index'))->assertUnauthorized();
    }

    public function test_employee_without_permission_cannot_access_settings(): void
    {
        $unauthorizedEmployee = Employee::factory()->create();

        $this->actingAs($unauthorizedEmployee, 'employee')
            ->getJson(route('api.v1.settings.index'))
            ->assertForbidden();
    }

    public function test_admin_can_retrieve_all_settings(): void
    {
        Setting::create(['key' => 'site_name', 'value' => 'Tameed CRM']);
        Setting::create(['key' => 'contact_email', 'value' => 'info@tameed.sa']);

        $this->actingAs($this->admin, 'employee')
            ->getJson(route('api.v1.settings.index'))
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.site_name', 'Tameed CRM')
            ->assertJsonPath('data.contact_email', 'info@tameed.sa');
    }

    public function test_admin_can_retrieve_single_setting(): void
    {
        Setting::create(['key' => 'vat_rate', 'value' => 15]);

        $this->actingAs($this->admin, 'employee')
            ->getJson(route('api.v1.settings.show', 'vat_rate'))
            ->assertOk()
            ->assertJsonPath('data.key', 'vat_rate')
            ->assertJsonPath('data.value', 15);
    }

    public function test_admin_can_update_settings(): void
    {
        $payload = [
            'settings' => [
                'site_name' => 'Tameed Pro CRM',
                'maintenance_mode' => false,
                'support_phone' => '920000000',
            ],
        ];

        $this->actingAs($this->admin, 'employee')
            ->putJson(route('api.v1.settings.update'), $payload)
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.site_name', 'Tameed Pro CRM')
            ->assertJsonPath('data.support_phone', '920000000');

        $this->assertDatabaseHas('settings', [
            'key' => 'site_name',
        ]);
    }

    public function test_update_settings_validation_error(): void
    {
        $this->actingAs($this->admin, 'employee')
            ->putJson(route('api.v1.settings.update'), [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['settings']);
    }
}
