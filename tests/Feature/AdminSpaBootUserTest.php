<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Employee;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class AdminSpaBootUserTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    public function test_guest_gets_a_null_boot_user(): void
    {
        $this->get(route('admin.spa', ['any' => 'login']))
            ->assertOk()
            ->assertSee('window.__BOOT_USER__ = null;', false);
    }

    public function test_signed_in_employee_matches_the_me_endpoint(): void
    {
        $employee = Employee::factory()->admin()->create();

        $boot = $this->bootUserFrom($this->actingAs($employee, 'employee')->get(route('admin.spa')));
        $me = $this->actingAs($employee, 'employee')->getJson(route('api.v1.auth.me'))->assertOk()->json('data');

        $this->assertSame($employee->id, $boot['id']);
        $this->assertEquals($me, $boot);
    }

    public function test_inactive_employee_is_treated_as_guest(): void
    {
        $employee = Employee::factory()->inactive()->create();

        $this->actingAs($employee, 'employee')
            ->get(route('admin.spa', ['any' => 'bookings']))
            ->assertOk()
            ->assertSee('window.__BOOT_USER__ = null;', false);
    }

    public function test_shell_is_never_cached(): void
    {
        $employee = Employee::factory()->create();

        $cacheControl = (string) $this->actingAs($employee, 'employee')
            ->get(route('admin.spa'))
            ->headers->get('Cache-Control');

        $this->assertStringContainsString('no-store', $cacheControl);
        $this->assertStringContainsString('private', $cacheControl);
    }

    public function test_boot_user_does_not_expose_the_password(): void
    {
        $employee = Employee::factory()->create();

        $boot = $this->bootUserFrom($this->actingAs($employee, 'employee')->get(route('admin.spa')));

        $this->assertArrayNotHasKey('password', $boot);
        $this->assertArrayNotHasKey('remember_token', $boot);
    }

    /**
     * @return array<string, mixed>
     */
    private function bootUserFrom(TestResponse $response): array
    {
        $response->assertOk();
        preg_match('/window\.__BOOT_USER__ = (\{.*\});/', (string) $response->getContent(), $matches);
        $this->assertNotEmpty($matches, 'Boot user script not found.');

        return json_decode($matches[1], true);
    }
}
