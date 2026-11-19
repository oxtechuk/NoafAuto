<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Models\Employee;
use App\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class BrandingTest extends TestCase
{
    use RefreshDatabase;

    private Employee $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = Employee::factory()->admin()->create();
    }

    public function test_can_retrieve_branding_with_defaults(): void
    {
        $response = $this->actingAs($this->admin, 'employee')
            ->getJson('/api/v1/branding');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.primary_color', '#092C29')
            ->assertJsonPath('data.safe_mode', false)
            ->assertJsonPath('data.child_theme.enabled', false);
    }

    public function test_branding_respects_child_theme_and_safe_mode_settings(): void
    {
        Setting::create(['key' => 'theme_child_enabled', 'value' => true]);
        Setting::create(['key' => 'theme_child_primary_color', 'value' => '#1A56DB']);
        Setting::create(['key' => 'theme_child_target_scope', 'value' => 'store_only']);
        Setting::create(['key' => 'theme_safe_mode', 'value' => true]);

        $response = $this->actingAs($this->admin, 'employee')
            ->getJson('/api/v1/branding');

        $response->assertOk()
            ->assertJsonPath('data.safe_mode', true)
            ->assertJsonPath('data.child_theme.enabled', true)
            ->assertJsonPath('data.child_theme.primary_color', '#1A56DB')
            ->assertJsonPath('data.child_theme.target_scope', 'store_only');
    }
}
