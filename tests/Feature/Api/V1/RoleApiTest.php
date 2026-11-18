<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Models\Employee;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RoleApiTest extends TestCase
{
    use RefreshDatabase;

    private Employee $admin;

    private Employee $sales;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::findOrCreate('manage-roles', 'employee');
        Permission::findOrCreate('manage-leads', 'employee');
        Permission::findOrCreate('manage-tasks', 'employee');

        $roleAdmin = Role::findOrCreate('admin', 'employee');
        $roleSales = Role::findOrCreate('sales', 'employee');

        $this->admin = Employee::factory()->admin()->create();
        $this->admin->assignRole($roleAdmin);

        $this->sales = Employee::factory()->create(['role' => 'sales']);
        $this->sales->assignRole($roleSales);
    }

    public function test_guest_cannot_list_roles(): void
    {
        $this->getJson(route('api.v1.roles.index'))->assertUnauthorized();
    }

    public function test_employee_without_permission_cannot_list_roles(): void
    {
        $this->actingAs($this->sales, 'employee')
            ->getJson(route('api.v1.roles.index'))
            ->assertForbidden();
    }

    public function test_admin_lists_roles(): void
    {
        $this->actingAs($this->admin, 'employee')
            ->getJson(route('api.v1.roles.index'))
            ->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_admin_lists_available_permissions(): void
    {
        $this->actingAs($this->admin, 'employee')
            ->getJson(route('api.v1.roles.permissions'))
            ->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_create_role_with_permissions(): void
    {
        $payload = [
            'name' => 'accountant',
            'permissions' => ['manage-tasks'],
        ];

        $response = $this->actingAs($this->admin, 'employee')
            ->postJson(route('api.v1.roles.store'), $payload)
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'accountant');

        $this->assertDatabaseHas('roles', [
            'name' => 'accountant',
            'guard_name' => 'employee',
        ]);

        /** @var Role $role */
        $role = Role::findByName('accountant', 'employee');
        $this->assertTrue($role->hasPermissionTo('manage-tasks'));
    }

    public function test_update_role(): void
    {
        $role = Role::create(['name' => 'custom_role', 'guard_name' => 'employee']);

        $this->actingAs($this->admin, 'employee')
            ->putJson(route('api.v1.roles.update', $role), [
                'name' => 'custom_role_updated',
                'permissions' => ['manage-leads', 'manage-tasks'],
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'custom_role_updated');

        $this->assertDatabaseHas('roles', [
            'id' => $role->id,
            'name' => 'custom_role_updated',
        ]);
    }

    public function test_cannot_delete_admin_role(): void
    {
        $adminRole = Role::findByName('admin', 'employee');

        $this->actingAs($this->admin, 'employee')
            ->deleteJson(route('api.v1.roles.destroy', $adminRole))
            ->assertForbidden();
    }

    public function test_delete_custom_role(): void
    {
        $customRole = Role::create(['name' => 'temporary_role', 'guard_name' => 'employee']);

        $this->actingAs($this->admin, 'employee')
            ->deleteJson(route('api.v1.roles.destroy', $customRole))
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('roles', ['id' => $customRole->id]);
    }
}
