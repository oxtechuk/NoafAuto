<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Api\Contracts\ApiResponse;
use App\Http\Controllers\Api\ApiBaseController;
use App\Http\Requests\Api\V1\Infrastructure\UpdateCdnRequest;
use App\Http\Requests\Api\V1\Infrastructure\UpdateCloudflareRequest;
use App\Http\Requests\Api\V1\Infrastructure\UpdateRedisRequest;
use App\Services\Infrastructure\CdnTester;
use App\Services\Infrastructure\CloudflareClient;
use App\Services\Infrastructure\InfrastructureConfigurator;
use App\Services\Infrastructure\InfrastructureSettings;
use App\Services\Infrastructure\RedisConnectionTester;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Throwable;

/**
 * Admin-only: server connections (Redis, Cloudflare, asset CDN). Every connection is tested before it
 * is switched on, so a wrong value can't take the site down.
 */
class InfrastructureController extends ApiBaseController
{
    public function __construct(
        private readonly InfrastructureSettings $settings,
        private readonly InfrastructureConfigurator $configurator,
    ) {
        parent::__construct();
    }

    public function show(Request $request): ApiResponse
    {
        $this->authorizeAdmin($request);

        return $this->respondSuccess($this->payload($request));
    }

    public function testRedis(UpdateRedisRequest $request, RedisConnectionTester $tester): ApiResponse
    {
        $result = $tester->test($this->configurator->redisConnection(0, $this->redisValues($request)));

        return $result['ok'] ? $this->respondSuccess($result, $result['message']) : $this->respondError($result['message'], 422);
    }

    public function updateRedis(UpdateRedisRequest $request, RedisConnectionTester $tester): ApiResponse
    {
        $values = $this->redisValues($request);
        $previous = $this->settings->section('redis');

        if ($values['enabled']) {
            $result = $tester->test($this->configurator->redisConnection(0, $values));
            if (! $result['ok']) {
                return $this->respondError($result['message'], 422);
            }
        }

        if ($request->boolean('clear_password')) {
            $this->settings->clearSecret('redis', 'password');
        }

        $this->settings->updateSection('redis', [
            'enabled' => $values['enabled'],
            'host' => $values['host'],
            'port' => $values['port'],
            'password' => $request->input('password'),
            'database' => $values['database'],
            'use_for_cache' => $values['use_for_cache'],
            'use_for_session' => $values['use_for_session'],
            'use_for_queue' => $values['use_for_queue'],
        ]);

        // Workers read their config at start: restart them when the queue driver changes.
        $queueWasRedis = $previous['enabled'] && $previous['use_for_queue'];
        $queueIsRedis = $values['enabled'] && $values['use_for_queue'];
        if ($queueWasRedis !== $queueIsRedis) {
            $this->restartQueueWorkers();
        }

        return $this->respondSuccess($this->payload($request), 'تم حفظ إعدادات Redis.');
    }

    public function updateCloudflare(UpdateCloudflareRequest $request, CloudflareClient $cloudflare): ApiResponse
    {
        $enabled = $request->boolean('enabled');
        $zoneId = strtolower((string) $request->input('zone_id', $this->settings->section('cloudflare')['zone_id']));
        $values = [
            'enabled' => $enabled,
            'zone_id' => $zoneId,
            'api_token' => $request->input('api_token'),
            'trust_proxies' => $request->boolean('trust_proxies', true),
        ];

        if ($enabled) {
            $token = (string) ($request->input('api_token') ?: $this->settings->cloudflareToken());
            if ($token === '') {
                return $this->respondError('أدخل API Token الخاص بـ Cloudflare.', 422);
            }

            try {
                $zone = $cloudflare->zone($zoneId, $token);
            } catch (Throwable $exception) {
                return $this->respondError($exception->getMessage(), 422);
            }

            $values['zone_name'] = $zone['name'];
            $values['ips'] = $cloudflare->edgeIps();
            $values['ips_fetched_at'] = now()->toIso8601String();
        }

        $this->settings->updateSection('cloudflare', $values);

        return $this->respondSuccess($this->payload($request), 'تم حفظ إعدادات Cloudflare.');
    }

    public function purgeCloudflare(Request $request, CloudflareClient $cloudflare): ApiResponse
    {
        $this->authorizeAdmin($request);

        $settings = $this->settings->section('cloudflare');
        $token = $this->settings->cloudflareToken();

        if (! $settings['enabled'] || $settings['zone_id'] === '' || $token === null) {
            return $this->respondError('فعّل ربط Cloudflare أولاً.', 422);
        }

        try {
            $cloudflare->purgeEverything($settings['zone_id'], $token);
        } catch (Throwable $exception) {
            return $this->respondError($exception->getMessage(), 422);
        }

        return $this->respondSuccess(null, 'تم مسح كاش Cloudflare بالكامل. قد يستغرق التحديث حتى 30 ثانية.');
    }

    public function testCdn(UpdateCdnRequest $request, CdnTester $tester): ApiResponse
    {
        $url = (string) $request->input('url');
        if ($url === '') {
            return $this->respondError('أدخل رابط الـ CDN.', 422);
        }

        $result = $tester->test($url);

        return $result['ok']
            ? $this->respondSuccess($result, $result['message'])
            : $this->respond($result, $result['message'], 422);
    }

    public function updateCdn(UpdateCdnRequest $request, CdnTester $tester): ApiResponse
    {
        $enabled = $request->boolean('enabled');
        $url = rtrim((string) $request->input('url', ''), '/');

        if ($enabled) {
            $result = $tester->test($url);
            if (! $result['ok']) {
                return $this->respond($result, $result['message'], 422);
            }
        }

        $this->settings->updateSection('cdn', ['enabled' => $enabled, 'url' => $url]);

        return $this->respondSuccess($this->payload($request), 'تم حفظ إعدادات الـ CDN.');
    }

    /**
     * Submitted Redis values, with the stored password used when none is typed.
     *
     * @return array{enabled: bool, host: string, port: int, password: ?string, database: int, use_for_cache: bool, use_for_session: bool, use_for_queue: bool}
     */
    private function redisValues(UpdateRedisRequest $request): array
    {
        $stored = $this->settings->section('redis');
        $password = $request->input('password');
        if ($password === null || $password === '') {
            $password = $request->boolean('clear_password') ? null : $this->settings->redisPassword();
        }

        return [
            'enabled' => $request->boolean('enabled'),
            'host' => (string) $request->input('host', $stored['host']),
            'port' => (int) $request->input('port', $stored['port']),
            'password' => $password,
            'database' => (int) $request->input('database', $stored['database']),
            'use_for_cache' => $request->boolean('use_for_cache', $stored['use_for_cache']),
            'use_for_session' => $request->boolean('use_for_session', $stored['use_for_session']),
            'use_for_queue' => $request->boolean('use_for_queue', $stored['use_for_queue']),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(Request $request): array
    {
        return [
            'settings' => $this->settings->masked(),
            'environment' => [
                'redis_client' => InfrastructureConfigurator::availableRedisClient(),
                'drivers' => [
                    'cache' => config('cache.default'),
                    'session' => config('session.driver'),
                    'queue' => config('queue.default'),
                ],
                'asset_url' => config('app.asset_url'),
                'behind_cloudflare' => $request->headers->has('CF-Ray'),
                'app_url' => rtrim((string) config('app.url'), '/'),
            ],
        ];
    }

    private function restartQueueWorkers(): void
    {
        try {
            Artisan::call('queue:restart');
        } catch (Throwable) {
            // Not fatal: workers pick the new driver on their next restart / deploy.
        }
    }

    private function authorizeAdmin(Request $request): void
    {
        abort_unless((bool) $request->user('employee')?->isAdmin(), 403, 'Unauthorized. Admin access required.');
    }
}
