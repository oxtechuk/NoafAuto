<?php

namespace Tests\Feature\Api\V1;

use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class SystemTest extends TestCase
{
    public function test_health_endpoint_reports_ok_when_services_are_healthy(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'ok')
            ->assertJsonPath('data.checks.database', 'ok')
            ->assertJsonPath('data.checks.cache', 'ok');
    }

    public function test_health_endpoint_reports_degraded_when_cache_fails(): void
    {
        Cache::shouldReceive('put')->andThrow(new \RuntimeException('Cache down'));

        $response = $this->getJson('/api/v1/health');

        $response->assertServiceUnavailable()
            ->assertJsonPath('success', false)
            ->assertJsonPath('data.status', 'degraded')
            ->assertJsonPath('data.checks.cache', 'failed');
    }

    public function test_system_info_returns_public_information(): void
    {
        config(['sitekit.version' => '9.9.9', 'sitekit.update_channel' => 'beta']);

        $response = $this->getJson('/api/v1/system/info');

        $response->assertOk()
            ->assertJsonPath('data.name', config('app.name'))
            ->assertJsonPath('data.version', '9.9.9')
            ->assertJsonPath('data.update_channel', 'beta')
            ->assertJsonPath('data.supported_locales', ['ar', 'en']);
    }

    public function test_system_endpoints_do_not_require_authentication(): void
    {
        $this->getJson('/api/v1/system/info')->assertOk();
        $this->getJson('/api/v1/health')->assertOk();
    }
}
