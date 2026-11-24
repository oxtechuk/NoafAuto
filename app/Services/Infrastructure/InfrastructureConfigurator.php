<?php

namespace App\Services\Infrastructure;

use Illuminate\Contracts\Config\Repository;
use Illuminate\Http\Middleware\TrustProxies;
use Illuminate\Support\Facades\Log;
use Predis\Client;

/**
 * Applies InfrastructureSettings to the runtime config at the start of every request / worker boot.
 *
 * Safety first: Redis drivers are only switched on when the extension/client exists and the server
 * answers a quick TCP probe; otherwise the app keeps its .env drivers (database) and logs a warning
 * at most every few minutes. A Redis outage therefore slows the site down instead of taking it down.
 */
class InfrastructureConfigurator
{
    private const PROBE_TIMEOUT_SECONDS = 0.3;

    private const DOWN_LOG_INTERVAL_SECONDS = 300;

    public function __construct(
        private readonly InfrastructureSettings $settings,
        private readonly Repository $config,
        private readonly string $downMarkerPath,
    ) {}

    public function apply(): void
    {
        $this->applyRedis();
        $this->applyCdn();
        $this->applyCloudflare();
    }

    /** "phpredis", "predis" or null when no Redis client is available in this PHP. */
    public static function availableRedisClient(): ?string
    {
        if (extension_loaded('redis')) {
            return 'phpredis';
        }

        return class_exists(Client::class) ? 'predis' : null;
    }

    /**
     * Laravel connection config for the stored Redis settings.
     *
     * @return array<string, mixed>
     */
    public function redisConnection(int $databaseOffset = 0, ?array $overrides = null): array
    {
        $redis = $overrides ?? $this->settings->section('redis');

        return [
            'url' => null,
            'host' => (string) $redis['host'],
            'username' => null,
            'password' => $overrides !== null ? ($overrides['password'] ?? null) : $this->settings->redisPassword(),
            'port' => (int) $redis['port'],
            'database' => (int) $redis['database'] + $databaseOffset,
            'timeout' => 1.0,
            'read_timeout' => 2.0,
        ];
    }

    private function applyRedis(): void
    {
        $redis = $this->settings->section('redis');
        $client = self::availableRedisClient();

        if (! $redis['enabled'] || $client === null) {
            return;
        }

        if (! $this->isReachable((string) $redis['host'], (int) $redis['port'])) {
            $this->reportDown((string) $redis['host'], (int) $redis['port']);

            return;
        }

        $this->config->set('database.redis.client', $client);
        $this->config->set('database.redis.default', $this->redisConnection());
        $this->config->set('database.redis.cache', $this->redisConnection(1));

        if ($redis['use_for_cache']) {
            $this->config->set('cache.default', 'redis');
            $this->config->set('cache.stores.redis.connection', 'cache');
            $this->config->set('cache.stores.redis.lock_connection', 'default');
        }

        if ($redis['use_for_session']) {
            $this->config->set('session.driver', 'redis');
            $this->config->set('session.connection', 'default');
        }

        if ($redis['use_for_queue']) {
            $this->config->set('queue.default', 'redis');
            $this->config->set('queue.connections.redis.connection', 'default');
        }
    }

    private function applyCdn(): void
    {
        $cdn = $this->settings->section('cdn');

        if ($cdn['enabled'] && $cdn['url'] !== '') {
            $this->config->set('app.asset_url', rtrim((string) $cdn['url'], '/'));
        }
    }

    private function applyCloudflare(): void
    {
        $cloudflare = $this->settings->section('cloudflare');

        // Without this, every visitor behind Cloudflare shares Cloudflare's IP: rate limits (login, OTP,
        // forms) would hit everyone at once and logs would show the wrong address.
        if ($cloudflare['enabled'] && $cloudflare['trust_proxies']) {
            TrustProxies::at($cloudflare['ips'] !== [] ? $cloudflare['ips'] : CloudflareClient::FALLBACK_IPS);
        }
    }

    private function isReachable(string $host, int $port): bool
    {
        $socket = @fsockopen($host, $port, $errorCode, $errorMessage, self::PROBE_TIMEOUT_SECONDS);

        if ($socket === false) {
            return false;
        }

        fclose($socket);

        return true;
    }

    private function reportDown(string $host, int $port): void
    {
        $lastLogged = @filemtime($this->downMarkerPath);
        if ($lastLogged !== false && time() - $lastLogged < self::DOWN_LOG_INTERVAL_SECONDS) {
            return;
        }

        @touch($this->downMarkerPath);
        Log::warning('Redis is enabled in the admin panel but not reachable; using the default drivers.', [
            'host' => $host,
            'port' => $port,
        ]);
    }
}
