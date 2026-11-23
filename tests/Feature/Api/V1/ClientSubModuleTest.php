<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Models\Employee;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class ClientSubModuleTest extends TestCase
{
    use RefreshDatabase;

    private Employee $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = Employee::factory()->admin()->create();
    }

    public function test_can_access_calculator_leads_endpoint(): void
    {
        $response = $this->actingAs($this->admin, 'employee')
            ->getJson('/api/v1/leads/calculator?page=1&per_page=15');

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_can_access_contact_sources_endpoint(): void
    {
        $response = $this->actingAs($this->admin, 'employee')
            ->getJson('/api/v1/leads/sources?page=1&per_page=15');

        $response->assertOk()
            ->assertJsonPath('success', true);
    }
}
