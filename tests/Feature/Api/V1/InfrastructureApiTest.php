<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Models\Employee;
use App\Services\Infrastructure\InfrastructureSettings;
use App\Services\Infrastructure\RedisConnectionTester;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Mockery;
use Tests\TestCase;

class InfrastructureApiTest extends TestCase
{
    use RefreshDatabase;

    private const ZONE_ID = '0123456789abcdef0123456789abcdef';

    private string $settingsPath;

    private Employee $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->settingsPath = sys_get_temp_dir().'/infra-'.bin2hex(random_bytes(6)).'.json';
        $this->app->singleton(InfrastructureSettings::class, fn () => new InfrastructureSettings($this->settingsPath));
        $this->admin = Employee::factory()->admin()->create();
    }

    protected function tearDown(): void
    {
        @unlink($this->settingsPath);

        parent::tearDown();
    }

    public function test_only_admins_can_see_or_change_infrastructure(): void
    {
        $employee = Employee::factory()->create();

        $this->actingAs($employee, 'employee')->getJson(route('api.v1.system.infrastructure.show'))->assertForbidden();
        $this->actingAs($employee, 'employee')->putJson(route('api.v1.system.infrastructure.cdn.update'), ['enabled' => false])->assertForbidden();
        $this->actingAs($employee, 'employee')->postJson(route('api.v1.system.infrastructure.cloudflare.purge'))->assertForbidden();
    }

    public function test_guests_are_rejected(): void
    {
        $this->getJson(route('api.v1.system.infrastructure.show'))->assertUnauthorized();
    }

    public function test_show_returns_defaults_and_environment(): void
    {
        $this->actingAs($this->admin, 'employee')
            ->getJson(route('api.v1.system.infrastructure.show'))
            ->assertOk()
            ->assertJsonPath('data.settings.redis.enabled', false)
            ->assertJsonPath('data.settings.cdn.enabled', false)
            ->assertJsonStructure(['data' => ['environment' => ['redis_client', 'drivers' => ['cache', 'session', 'queue'], 'behind_cloudflare']]]);
    }

    public function test_redis_is_saved_only_after_a_successful_test_and_password_stays_secret(): void
    {
        $this->fakeRedisTester(ok: true);

        $response = $this->actingAs($this->admin, 'employee')->putJson(route('api.v1.system.infrastructure.redis.update'), [
            'enabled' => true,
            'host' => '10.0.0.5',
            'port' => 6380,
            'password' => 's3cret-pass',
            'use_for_cache' => true,
            'use_for_session' => false,
            'use_for_queue' => false,
        ]);

        $response->assertOk()
            ->assertJsonPath('data.settings.redis.enabled', true)
            ->assertJsonPath('data.settings.redis.host', '10.0.0.5')
            ->assertJsonPath('data.settings.redis.has_password', true)
            ->assertJsonMissingPath('data.settings.redis.password');

        $this->assertStringNotContainsString('s3cret-pass', $response->getContent());
        $this->assertStringNotContainsString('s3cret-pass', (string) file_get_contents($this->settingsPath));
        $this->assertSame('s3cret-pass', app(InfrastructureSettings::class)->redisPassword());
    }

    public function test_failed_redis_test_does_not_enable_it(): void
    {
        $this->fakeRedisTester(ok: false, message: 'تعذر الاتصال بـ Redis: Connection refused');

        $this->actingAs($this->admin, 'employee')
            ->putJson(route('api.v1.system.infrastructure.redis.update'), ['enabled' => true, 'host' => '127.0.0.1', 'port' => 6379])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'تعذر الاتصال بـ Redis: Connection refused');

        $this->assertFalse(app(InfrastructureSettings::class)->section('redis')['enabled']);
    }

    public function test_saving_without_a_password_keeps_the_stored_one(): void
    {
        $this->fakeRedisTester(ok: true);
        $this->actingAs($this->admin, 'employee')->putJson(route('api.v1.system.infrastructure.redis.update'), [
            'enabled' => true, 'host' => '127.0.0.1', 'port' => 6379, 'password' => 'keep-me',
        ])->assertOk();

        $this->actingAs($this->admin, 'employee')->putJson(route('api.v1.system.infrastructure.redis.update'), [
            'enabled' => true, 'host' => '127.0.0.1', 'port' => 6379, 'password' => '',
        ])->assertOk();

        $this->assertSame('keep-me', app(InfrastructureSettings::class)->redisPassword());
    }

    public function test_password_can_be_cleared(): void
    {
        $this->fakeRedisTester(ok: true);
        $this->actingAs($this->admin, 'employee')->putJson(route('api.v1.system.infrastructure.redis.update'), [
            'enabled' => true, 'host' => '127.0.0.1', 'port' => 6379, 'password' => 'old',
        ])->assertOk();

        $this->actingAs($this->admin, 'employee')->putJson(route('api.v1.system.infrastructure.redis.update'), [
            'enabled' => true, 'host' => '127.0.0.1', 'port' => 6379, 'clear_password' => true,
        ])->assertOk()->assertJsonPath('data.settings.redis.has_password', false);

        $this->assertNull(app(InfrastructureSettings::class)->redisPassword());
    }

    public function test_redis_can_be_disabled_without_testing(): void
    {
        $tester = Mockery::mock(RedisConnectionTester::class);
        $tester->shouldNotReceive('test');
        $this->app->instance(RedisConnectionTester::class, $tester);

        $this->actingAs($this->admin, 'employee')
            ->putJson(route('api.v1.system.infrastructure.redis.update'), ['enabled' => false])
            ->assertOk()
            ->assertJsonPath('data.settings.redis.enabled', false);
    }

    public function test_redis_host_is_validated(): void
    {
        $this->actingAs($this->admin, 'employee')
            ->putJson(route('api.v1.system.infrastructure.redis.update'), ['enabled' => true, 'host' => 'bad host; rm', 'port' => 70000])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['host', 'port']);
    }

    public function test_cloudflare_is_verified_and_stores_zone_and_edge_ips(): void
    {
        Http::fake([
            'api.cloudflare.com/client/v4/zones/'.self::ZONE_ID => Http::response(['success' => true, 'result' => ['name' => 'example.com', 'status' => 'active', 'plan' => ['name' => 'Free']]]),
            'api.cloudflare.com/client/v4/ips' => Http::response(['success' => true, 'result' => ['ipv4_cidrs' => ['173.245.48.0/20'], 'ipv6_cidrs' => ['2400:cb00::/32']]]),
        ]);

        $response = $this->actingAs($this->admin, 'employee')->putJson(route('api.v1.system.infrastructure.cloudflare.update'), [
            'enabled' => true,
            'zone_id' => self::ZONE_ID,
            'api_token' => 'cf-token-value',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.settings.cloudflare.zone_name', 'example.com')
            ->assertJsonPath('data.settings.cloudflare.ips', ['173.245.48.0/20', '2400:cb00::/32'])
            ->assertJsonPath('data.settings.cloudflare.has_api_token', true)
            ->assertJsonMissingPath('data.settings.cloudflare.api_token');

        $this->assertStringNotContainsString('cf-token-value', $response->getContent());
        Http::assertSent(fn ($request) => $request->hasHeader('Authorization', 'Bearer cf-token-value'));
    }

    public function test_rejected_cloudflare_token_is_not_saved(): void
    {
        Http::fake(['api.cloudflare.com/*' => Http::response(['success' => false, 'errors' => [['message' => 'Invalid API Token']]], 403)]);

        $this->actingAs($this->admin, 'employee')
            ->putJson(route('api.v1.system.infrastructure.cloudflare.update'), ['enabled' => true, 'zone_id' => self::ZONE_ID, 'api_token' => 'wrong'])
            ->assertUnprocessable();

        $this->assertFalse(app(InfrastructureSettings::class)->section('cloudflare')['enabled']);
        $this->assertNull(app(InfrastructureSettings::class)->cloudflareToken());
    }

    public function test_cloudflare_zone_id_is_validated(): void
    {
        $this->actingAs($this->admin, 'employee')
            ->putJson(route('api.v1.system.infrastructure.cloudflare.update'), ['enabled' => true, 'zone_id' => 'not-a-zone'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['zone_id']);
    }

    public function test_cloudflare_falls_back_to_built_in_ips_when_list_is_unreachable(): void
    {
        Http::fake([
            'api.cloudflare.com/client/v4/zones/*' => Http::response(['success' => true, 'result' => ['name' => 'example.com', 'status' => 'active']]),
            'api.cloudflare.com/client/v4/ips' => Http::response(null, 500),
        ]);

        $this->actingAs($this->admin, 'employee')
            ->putJson(route('api.v1.system.infrastructure.cloudflare.update'), ['enabled' => true, 'zone_id' => self::ZONE_ID, 'api_token' => 't'])
            ->assertOk();

        $this->assertContains('173.245.48.0/20', app(InfrastructureSettings::class)->section('cloudflare')['ips']);
    }

    public function test_cloudflare_purge(): void
    {
        Http::fake([
            'api.cloudflare.com/client/v4/zones/'.self::ZONE_ID => Http::response(['success' => true, 'result' => ['name' => 'example.com']]),
            'api.cloudflare.com/client/v4/ips' => Http::response(['success' => true, 'result' => ['ipv4_cidrs' => ['1.1.1.0/24']]]),
            'api.cloudflare.com/client/v4/zones/'.self::ZONE_ID.'/purge_cache' => Http::response(['success' => true, 'result' => ['id' => self::ZONE_ID]]),
        ]);
        $this->actingAs($this->admin, 'employee')->putJson(route('api.v1.system.infrastructure.cloudflare.update'), [
            'enabled' => true, 'zone_id' => self::ZONE_ID, 'api_token' => 't',
        ])->assertOk();

        $this->actingAs($this->admin, 'employee')->postJson(route('api.v1.system.infrastructure.cloudflare.purge'))->assertOk();

        Http::assertSent(fn ($request) => str_ends_with($request->url(), '/purge_cache') && $request['purge_everything'] === true);
    }

    public function test_purge_requires_cloudflare_to_be_connected(): void
    {
        $this->actingAs($this->admin, 'employee')->postJson(route('api.v1.system.infrastructure.cloudflare.purge'))->assertUnprocessable();
    }

    public function test_cdn_is_enabled_only_when_it_serves_this_build_with_cors(): void
    {
        $manifest = $this->localManifest();
        $script = collect($manifest)->first(fn ($entry) => str_ends_with((string) ($entry['file'] ?? ''), '.js'));
        Http::fake([
            'cdn.example.net/build/manifest.json' => Http::response($manifest),
            'cdn.example.net/build/'.$script['file'] => Http::response('js', 200, ['Access-Control-Allow-Origin' => '*']),
        ]);

        $this->actingAs($this->admin, 'employee')
            ->putJson(route('api.v1.system.infrastructure.cdn.update'), ['enabled' => true, 'url' => 'https://cdn.example.net/'])
            ->assertOk()
            ->assertJsonPath('data.settings.cdn.enabled', true)
            ->assertJsonPath('data.settings.cdn.url', 'https://cdn.example.net');
    }

    public function test_cdn_without_cors_is_refused_with_a_warning(): void
    {
        $manifest = $this->localManifest();
        Http::fake([
            'cdn.example.net/build/manifest.json' => Http::response($manifest),
            'cdn.example.net/build/*' => Http::response('js'),
        ]);

        $this->actingAs($this->admin, 'employee')
            ->putJson(route('api.v1.system.infrastructure.cdn.update'), ['enabled' => true, 'url' => 'https://cdn.example.net'])
            ->assertUnprocessable()
            ->assertJsonCount(1, 'data.warnings');

        $this->assertFalse(app(InfrastructureSettings::class)->section('cdn')['enabled']);
    }

    public function test_cdn_serving_a_different_build_is_refused(): void
    {
        $this->localManifest();
        Http::fake(['cdn.example.net/*' => Http::response(['other' => ['file' => 'x.js']])]);

        $this->actingAs($this->admin, 'employee')
            ->putJson(route('api.v1.system.infrastructure.cdn.update'), ['enabled' => true, 'url' => 'https://cdn.example.net'])
            ->assertUnprocessable();
    }

    public function test_cdn_must_be_another_domain(): void
    {
        $this->actingAs($this->admin, 'employee')
            ->putJson(route('api.v1.system.infrastructure.cdn.update'), ['enabled' => true, 'url' => rtrim((string) config('app.url'), '/').'/cdn'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['url']);
    }

    public function test_cdn_can_be_disabled_without_testing(): void
    {
        Http::fake();

        $this->actingAs($this->admin, 'employee')
            ->putJson(route('api.v1.system.infrastructure.cdn.update'), ['enabled' => false])
            ->assertOk();

        Http::assertNothingSent();
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function localManifest(): array
    {
        $path = public_path('build/manifest.json');
        if (! is_file($path)) {
            $this->markTestSkipped('No frontend build in this environment.');
        }

        return json_decode((string) file_get_contents($path), true);
    }

    private function fakeRedisTester(bool $ok, string $message = 'ok'): void
    {
        $tester = Mockery::mock(RedisConnectionTester::class);
        $tester->shouldReceive('test')->andReturn(['ok' => $ok, 'message' => $message, 'version' => $ok ? '7.2.0' : null, 'client' => 'phpredis']);
        $this->app->instance(RedisConnectionTester::class, $tester);
    }
}
