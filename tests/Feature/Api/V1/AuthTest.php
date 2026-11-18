<?php

namespace Tests\Feature\Api\V1;

use App\Models\Employee;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_employee_can_log_in_with_username(): void
    {
        $employee = Employee::factory()->create(['username' => 'sara']);

        $response = $this->postJson(route('api.v1.auth.login'), [
            'username' => 'sara',
            'password' => 'password',
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.id', $employee->id)
            ->assertJsonMissingPath('data.password');

        $this->assertAuthenticatedAs($employee, 'employee');
    }

    public function test_employee_can_log_in_with_email(): void
    {
        $employee = Employee::factory()->create(['email' => 'sara@example.com']);

        $this->postJson(route('api.v1.auth.login'), [
            'username' => 'sara@example.com',
            'password' => 'password',
        ])->assertOk();

        $this->assertAuthenticatedAs($employee, 'employee');
    }

    public function test_login_fails_with_wrong_password(): void
    {
        Employee::factory()->create(['username' => 'sara']);

        $this->postJson(route('api.v1.auth.login'), [
            'username' => 'sara',
            'password' => 'wrong-password',
        ])->assertUnprocessable()->assertJsonValidationErrors('username');

        $this->assertGuest('employee');
    }

    public function test_inactive_employee_cannot_log_in(): void
    {
        Employee::factory()->inactive()->create(['username' => 'former']);

        $this->postJson(route('api.v1.auth.login'), [
            'username' => 'former',
            'password' => 'password',
        ])->assertUnprocessable();

        $this->assertGuest('employee');
    }

    public function test_login_requires_username_and_password(): void
    {
        $this->postJson(route('api.v1.auth.login'), [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['username', 'password']);
    }

    public function test_login_is_rate_limited(): void
    {
        foreach (range(1, 5) as $attempt) {
            $this->postJson(route('api.v1.auth.login'), ['username' => 'sara', 'password' => 'wrong']);
        }

        $this->postJson(route('api.v1.auth.login'), ['username' => 'sara', 'password' => 'wrong'])
            ->assertTooManyRequests();
    }

    public function test_me_returns_employee_with_roles_and_permissions(): void
    {
        $permission = Permission::findOrCreate('test-permission', 'employee');
        $role = Role::findOrCreate('test-role', 'employee');
        $role->syncPermissions([$permission]);

        $employee = Employee::factory()->create();
        $employee->assignRole($role);

        $this->actingAs($employee, 'employee')
            ->getJson(route('api.v1.auth.me'))
            ->assertOk()
            ->assertJsonPath('data.id', $employee->id)
            ->assertJsonPath('data.roles', ['test-role'])
            ->assertJsonPath('data.permissions', ['test-permission']);
    }

    public function test_me_requires_authentication(): void
    {
        $this->getJson(route('api.v1.auth.me'))
            ->assertUnauthorized()
            ->assertJsonPath('success', false);
    }

    public function test_employee_can_log_out(): void
    {
        $employee = Employee::factory()->create();

        $this->actingAs($employee, 'employee')
            ->postJson(route('api.v1.auth.logout'))
            ->assertOk();

        $this->assertGuest('employee');
    }

    public function test_logout_requires_authentication(): void
    {
        $this->postJson(route('api.v1.auth.logout'))->assertUnauthorized();
    }

    public function test_inactive_employee_cannot_log_in_to_crm(): void
    {
        Employee::factory()->inactive()->create(['username' => 'former']);

        $this->post(route('crm.login.post'), ['username' => 'former', 'password' => 'password'])
            ->assertSessionHasErrors('username');

        $this->assertGuest('employee');
    }

    public function test_active_employee_can_still_log_in_to_crm(): void
    {
        $employee = Employee::factory()->create(['username' => 'sara']);

        $this->post(route('crm.login.post'), ['username' => 'sara', 'password' => 'password'])
            ->assertRedirect(route('crm.dashboard'));

        $this->assertAuthenticatedAs($employee, 'employee');
    }
}
