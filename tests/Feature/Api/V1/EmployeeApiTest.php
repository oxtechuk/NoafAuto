<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Models\Employee;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class EmployeeApiTest extends TestCase
{
    use RefreshDatabase;

    private Employee $admin;

    private Employee $manager;

    private Employee $sales;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::findOrCreate('manage-employees', 'employee');

        $roleAdmin = Role::findOrCreate('admin', 'employee');
        $roleSales = Role::findOrCreate('sales', 'employee');

        $this->admin = Employee::factory()->admin()->create();
        $this->admin->assignRole($roleAdmin);

        $this->manager = Employee::factory()->create(['role' => 'manager']);
        $this->manager->givePermissionTo('manage-employees');

        $this->sales = Employee::factory()->create(['role' => 'sales']);
        $this->sales->assignRole($roleSales);
    }

    public function test_guest_cannot_list_employees(): void
    {
        $this->getJson(route('api.v1.employees.index'))->assertUnauthorized();
    }

    public function test_employee_without_permission_cannot_list_employees(): void
    {
        $this->actingAs($this->sales, 'employee')
            ->getJson(route('api.v1.employees.index'))
            ->assertForbidden();
    }

    public function test_admin_lists_employees_paginated_and_filters(): void
    {
        $this->actingAs($this->admin, 'employee')
            ->getJson(route('api.v1.employees.index', ['role' => 'sales']))
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $this->sales->id);
    }

    public function test_admin_can_retrieve_all_employees_unpaginated_for_select(): void
    {
        $this->actingAs($this->admin, 'employee')
            ->getJson(route('api.v1.employees.index', ['all' => 1]))
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(3, 'data');
    }

    public function test_create_employee(): void
    {
        $payload = [
            'name' => 'Sara Al-Otaibi',
            'username' => 'sara',
            'email' => 'sara@example.com',
            'password' => 'secret123',
            'phone' => '0555555555',
            'role' => 'sales',
            'is_active' => true,
        ];

        $response = $this->actingAs($this->admin, 'employee')
            ->postJson(route('api.v1.employees.store'), $payload)
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.email', 'sara@example.com')
            ->assertJsonPath('data.name', 'Sara Al-Otaibi');

        $this->assertDatabaseHas('employees', [
            'id' => $response->json('data.id'),
            'email' => 'sara@example.com',
            'role' => 'sales',
        ]);

        /** @var Employee $created */
        $created = Employee::find($response->json('data.id'));
        $this->assertTrue(Hash::check('secret123', $created->password));
        $this->assertTrue($created->hasRole('sales'));
    }

    public function test_create_employee_validation_errors(): void
    {
        $this->actingAs($this->admin, 'employee')
            ->postJson(route('api.v1.employees.store'), [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'email', 'password', 'role']);
    }

    public function test_show_employee(): void
    {
        $this->actingAs($this->admin, 'employee')
            ->getJson(route('api.v1.employees.show', $this->sales))
            ->assertOk()
            ->assertJsonPath('data.id', $this->sales->id)
            ->assertJsonPath('data.name', $this->sales->name);
    }

    public function test_update_employee(): void
    {
        $this->actingAs($this->admin, 'employee')
            ->putJson(route('api.v1.employees.update', $this->sales), [
                'name' => 'Updated Sales Name',
                'email' => $this->sales->email,
                'role' => 'sales',
                'phone' => '0500000001',
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Updated Sales Name')
            ->assertJsonPath('data.phone', '0500000001');

        $this->assertDatabaseHas('employees', [
            'id' => $this->sales->id,
            'name' => 'Updated Sales Name',
        ]);
    }

    public function test_toggle_active_status(): void
    {
        $this->assertTrue($this->sales->is_active);

        // Deactivate
        $this->actingAs($this->admin, 'employee')
            ->postJson(route('api.v1.employees.toggle-active', $this->sales))
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        $this->assertFalse($this->sales->fresh()->is_active);

        // Reactivate
        $this->actingAs($this->admin, 'employee')
            ->postJson(route('api.v1.employees.toggle-active', $this->sales))
            ->assertOk()
            ->assertJsonPath('data.is_active', true);

        $this->assertTrue($this->sales->fresh()->is_active);
    }

    public function test_employee_cannot_deactivate_themselves(): void
    {
        $this->actingAs($this->admin, 'employee')
            ->postJson(route('api.v1.employees.toggle-active', $this->admin))
            ->assertForbidden();
    }

    public function test_delete_employee(): void
    {
        $target = Employee::factory()->create();

        $this->actingAs($this->admin, 'employee')
            ->deleteJson(route('api.v1.employees.destroy', $target))
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('employees', ['id' => $target->id]);
    }

    public function test_employee_cannot_delete_themselves(): void
    {
        $this->actingAs($this->admin, 'employee')
            ->deleteJson(route('api.v1.employees.destroy', $this->admin))
            ->assertForbidden();
    }
}
