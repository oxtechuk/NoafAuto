<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Services\Infrastructure\CloudflareClient;
use App\Services\Infrastructure\InfrastructureConfigurator;
use App\Services\Infrastructure\InfrastructureSettings;
use Illuminate\Http\Middleware\TrustProxies;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use ReflectionProperty;
use Tests\TestCase;

class InfrastructureConfiguratorTest extends TestCase
{
    private string $settingsPath;

    private string $markerPath;

    protected function setUp(): void
    {
        parent::setUp();

        $this->settingsPath = sys_get_temp_dir().'/infra-'.bin2hex(random_bytes(6)).'.json';
        $this->markerPath = sys_get_temp_dir().'/infra-marker-'.bin2hex(random_bytes(6));
    }

    protected function tearDown(): void
    {
        @unlink($this->settingsPath);
        @unlink($this->markerPath);
        $this->resetTrustedProxies();

        parent::tearDown();
    }

    public function test_nothing_changes_with_default_settings(): void
    {
        $before = [config('cache.default'), config('session.driver'), config('queue.default'), config('app.asset_url')];

        $this->configurator()->apply();

        $this->assertSame($before, [config('cache.default'), config('session.driver'), config('queue.default'), config('app.asset_url')]);
    }

    public function test_cdn_sets_the_asset_url(): void
    {
        $this->settings()->updateSection('cdn', ['enabled' => true, 'url' => 'https://cdn.example.net/']);

        $this->configurator()->apply();

        $this->assertSame('https://cdn.example.net', config('app.asset_url'));
    }

    public function test_disabled_cdn_is_ignored(): void
    {
        $this->settings()->updateSection('cdn', ['enabled' => false, 'url' => 'https://cdn.example.net']);
        config(['app.asset_url' => null]);

        $this->configurator()->apply();

        $this->assertNull(config('app.asset_url'));
    }

    public function test_unreachable_redis_keeps_the_default_drivers_and_logs_once(): void
    {
        $this->settings()->updateSection('redis', [
            'enabled' => true, 'host' => '127.0.0.1', 'port' => $this->closedPort(),
            'use_for_cache' => true, 'use_for_session' => true, 'use_for_queue' => true,
        ]);
        $before = [config('cache.default'), config('session.driver'), config('queue.default')];

        $this->configurator()->apply();
        $this->configurator()->apply();

        $this->assertSame($before, [config('cache.default'), config('session.driver'), config('queue.default')]);

        if (InfrastructureConfigurator::availableRedisClient() === null) {
            // No Redis client in this PHP: it bails out before probing, and never switches drivers.
            $this->assertFileDoesNotExist($this->markerPath);
        } else {
            $this->assertFileExists($this->markerPath);
        }
    }

    public function test_redis_settings_without_a_php_client_never_switch_drivers(): void
    {
        if (InfrastructureConfigurator::availableRedisClient() !== null) {
            $this->markTestSkipped('This PHP has a Redis client.');
        }

        $this->settings()->updateSection('redis', ['enabled' => true, 'use_for_cache' => true]);
        $before = config('cache.default');

        $this->configurator()->apply();

        $this->assertSame($before, config('cache.default'));
    }

    public function test_cloudflare_trusts_only_cloudflare_ranges(): void
    {
        $this->settings()->updateSection('cloudflare', ['enabled' => true, 'trust_proxies' => true, 'ips' => ['10.9.0.0/16']]);
        $this->configurator()->apply();

        Route::get('/_probe-ip', fn (Request $request) => $request->ip());

        $this->withServerVariables(['REMOTE_ADDR' => '10.9.1.1'])
            ->withHeader('X-Forwarded-For', '203.0.113.7')
            ->get('/_probe-ip')
            ->assertSee('203.0.113.7');

        $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.20'])
            ->withHeader('X-Forwarded-For', '203.0.113.7')
            ->get('/_probe-ip')
            ->assertSee('198.51.100.20');
    }

    public function test_cloudflare_uses_built_in_ranges_before_the_list_is_fetched(): void
    {
        $this->settings()->updateSection('cloudflare', ['enabled' => true, 'trust_proxies' => true, 'ips' => []]);

        $this->configurator()->apply();

        $this->assertSame(CloudflareClient::FALLBACK_IPS, $this->trustedProxies());
    }

    public function test_settings_file_with_garbage_falls_back_to_defaults(): void
    {
        file_put_contents($this->settingsPath, '{not json');

        $this->assertSame(InfrastructureSettings::defaults(), $this->settings()->all());
    }

    private function settings(): InfrastructureSettings
    {
        return new InfrastructureSettings($this->settingsPath);
    }

    private function configurator(): InfrastructureConfigurator
    {
        return new InfrastructureConfigurator($this->settings(), app('config'), $this->markerPath);
    }

    private function closedPort(): int
    {
        $server = stream_socket_server('tcp://127.0.0.1:0');
        $port = (int) substr((string) stream_socket_get_name($server, false), strrpos((string) stream_socket_get_name($server, false), ':') + 1);
        fclose($server);

        return $port;
    }

    /**
     * @return array<int, string>|string|null
     */
    private function trustedProxies(): array|string|null
    {
        return (new ReflectionProperty(TrustProxies::class, 'alwaysTrustProxies'))->getValue();
    }

    private function resetTrustedProxies(): void
    {
        TrustProxies::flushState();
    }
}
