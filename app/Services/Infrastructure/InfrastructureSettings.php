<?php

namespace App\Services\Infrastructure;

use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Crypt;

/**
 * Server-level connections managed from the admin panel: Redis, Cloudflare and an asset CDN.
 *
 * Stored in a JSON file (not the settings table) because it is applied at the very start of every
 * request, before the cache exists, and must not cost a database query. Secrets are encrypted with
 * APP_KEY and never leave this class in plain text except through the explicit secret getters.
 */
class InfrastructureSettings
{
    /** @var array<string, mixed>|null */
    private ?array $data = null;

    public function __construct(private readonly string $path) {}

    /**
     * @return array{
     *     redis: array{enabled: bool, host: string, port: int, password: ?string, database: int, use_for_cache: bool, use_for_session: bool, use_for_queue: bool},
     *     cloudflare: array{enabled: bool, zone_id: string, api_token: ?string, zone_name: ?string, trust_proxies: bool, ips: list<string>, ips_fetched_at: ?string},
     *     cdn: array{enabled: bool, url: string}
     * }
     */
    public static function defaults(): array
    {
        return [
            'redis' => [
                'enabled' => false,
                'host' => '127.0.0.1',
                'port' => 6379,
                'password' => null,
                'database' => 0,
                'use_for_cache' => true,
                'use_for_session' => false,
                'use_for_queue' => false,
            ],
            'cloudflare' => [
                'enabled' => false,
                'zone_id' => '',
                'api_token' => null,
                'zone_name' => null,
                'trust_proxies' => true,
                'ips' => [],
                'ips_fetched_at' => null,
            ],
            'cdn' => [
                'enabled' => false,
                'url' => '',
            ],
        ];
    }

    /**
     * Stored values merged over the defaults. Secret fields hold encrypted strings.
     *
     * @return array<string, array<string, mixed>>
     */
    public function all(): array
    {
        if ($this->data !== null) {
            return $this->data;
        }

        $stored = [];
        if (is_file($this->path)) {
            $decoded = json_decode((string) file_get_contents($this->path), true);
            $stored = is_array($decoded) ? $decoded : [];
        }

        $data = self::defaults();
        foreach ($data as $section => $values) {
            if (isset($stored[$section]) && is_array($stored[$section])) {
                $data[$section] = array_merge($values, array_intersect_key($stored[$section], $values));
            }
        }

        return $this->data = $data;
    }

    /**
     * @return array<string, mixed>
     */
    public function section(string $section): array
    {
        return $this->all()[$section] ?? [];
    }

    /**
     * Merge new values into a section. Secrets ('password', 'api_token') are encrypted here;
     * pass null or '' for a secret to keep the stored one.
     *
     * @param  array<string, mixed>  $values
     */
    public function updateSection(string $section, array $values): void
    {
        $data = $this->all();
        $current = $data[$section] ?? [];

        foreach (['password', 'api_token'] as $secret) {
            if (! array_key_exists($secret, $values)) {
                continue;
            }

            if ($values[$secret] === null || $values[$secret] === '') {
                unset($values[$secret]);
            } else {
                $values[$secret] = Crypt::encryptString((string) $values[$secret]);
            }
        }

        $data[$section] = array_merge($current, array_intersect_key($values, $current));
        $this->write($data);
    }

    public function clearSecret(string $section, string $field): void
    {
        $data = $this->all();
        if (array_key_exists($field, $data[$section] ?? [])) {
            $data[$section][$field] = null;
            $this->write($data);
        }
    }

    public function redisPassword(): ?string
    {
        return $this->decrypt($this->section('redis')['password'] ?? null);
    }

    public function cloudflareToken(): ?string
    {
        return $this->decrypt($this->section('cloudflare')['api_token'] ?? null);
    }

    /**
     * Everything except secret values (replaced by "is set" flags), safe to send to the browser.
     *
     * @return array<string, array<string, mixed>>
     */
    public function masked(): array
    {
        $data = $this->all();

        $data['redis']['has_password'] = $data['redis']['password'] !== null;
        unset($data['redis']['password']);

        $data['cloudflare']['has_api_token'] = $data['cloudflare']['api_token'] !== null;
        unset($data['cloudflare']['api_token']);

        return $data;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function write(array $data): void
    {
        $directory = dirname($this->path);
        if (! is_dir($directory)) {
            mkdir($directory, 0755, true);
        }

        // Write-then-rename so a request reading the file never sees half of it.
        $temporary = $this->path.'.'.bin2hex(random_bytes(4)).'.tmp';
        file_put_contents($temporary, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        rename($temporary, $this->path);

        $this->data = $data;
    }

    private function decrypt(mixed $value): ?string
    {
        if (! is_string($value) || $value === '') {
            return null;
        }

        try {
            return Crypt::decryptString($value);
        } catch (DecryptException) {
            // APP_KEY changed since the secret was saved: treat as not set.
            return null;
        }
    }
}
