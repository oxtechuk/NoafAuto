<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\ModuleRegistry;
use App\Models\UpdateHistory;
use App\Services\Health\HealthCheckService;
use App\Services\Updates\UpdateCheckerService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SitekitOperationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_sitekit_version_command_outputs_metadata(): void
    {
        $this->artisan('sitekit:version')
            ->expectsOutputToContain('Sitekit Core Information')
            ->expectsOutputToContain((string) config('sitekit.version'))
            ->assertSuccessful();
    }

    public function test_sitekit_health_check_service_and_command(): void
    {
        $service = app(HealthCheckService::class);
        $result = $service->check();

        $this->assertTrue($result['healthy']);
        $this->assertEquals('ok', $result['checks']['php_version']['status']);
        $this->assertEquals('ok', $result['checks']['database']['status']);
        $this->assertEquals('ok', $result['checks']['cache']['status']);

        $this->artisan('sitekit:health-check')
            ->expectsOutputToContain('All system components are healthy and operational.')
            ->assertSuccessful();
    }

    public function test_sitekit_updates_check_with_default_manifest(): void
    {
        $checker = app(UpdateCheckerService::class);
        $result = $checker->checkForUpdates();

        $this->assertTrue($result['has_update']);
        $this->assertEquals('1.0.0', $result['latest_version']);

        $this->artisan('sitekit:updates:check')
            ->expectsOutputToContain('A new version (1.0.0) is available!')
            ->assertSuccessful();
    }

    public function test_sitekit_updates_check_with_remote_manifest(): void
    {
        config(['sitekit.manifest_url' => 'https://updates.sitekit.dev/manifest.json']);

        Http::fake([
            'https://updates.sitekit.dev/manifest.json' => Http::response([
                'version' => '2.0.0',
                'changelog' => 'Major 2.0 release',
            ], 200),
        ]);

        $checker = app(UpdateCheckerService::class);
        $result = $checker->checkForUpdates();

        $this->assertTrue($result['has_update']);
        $this->assertEquals('2.0.0', $result['latest_version']);
        $this->assertEquals('Major 2.0 release', $result['changelog']);
    }

    public function test_sitekit_upgrade_dry_run_does_not_create_history_record(): void
    {
        $this->artisan('sitekit:upgrade', ['--dry-run' => true])
            ->expectsOutputToContain('Starting Sitekit upgrade simulation (DRY RUN)')
            ->expectsOutputToContain('Sitekit upgrade completed successfully!')
            ->assertSuccessful();

        $this->assertDatabaseCount('update_history', 0);
    }

    public function test_sitekit_upgrade_execution_creates_success_history(): void
    {
        $this->artisan('sitekit:upgrade', ['--to' => '1.0.0'])
            ->expectsOutputToContain('Sitekit upgrade completed successfully!')
            ->assertSuccessful();

        $this->assertDatabaseHas('update_history', [
            'to_version' => '1.0.0',
            'status' => 'success',
        ]);

        $record = UpdateHistory::first();
        $this->assertNotNull($record->finished_at);
        $this->assertIsArray($record->log);
        $this->assertNull($record->error);
    }

    public function test_module_registry_model_persistence(): void
    {
        $module = ModuleRegistry::create([
            'key' => 'blog',
            'name' => 'Blog Module',
            'version' => '1.0.0',
            'enabled' => true,
            'config' => ['featured_posts' => 5],
            'installed_at' => now(),
        ]);

        $this->assertDatabaseHas('modules_registry', [
            'key' => 'blog',
            'enabled' => true,
        ]);

        $module->update(['enabled' => false]);
        $this->assertFalse($module->fresh()->enabled);
    }
}
