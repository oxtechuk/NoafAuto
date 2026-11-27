<?php

declare(strict_types=1);

namespace App\Services\Updates;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

/**
 * Detects newer Sitekit core releases.
 *
 * Sources, in priority order:
 *  1. GitHub releases of the configured upstream (base) repository.
 *  2. A legacy JSON manifest URL.
 *  3. Nothing configured → no update is reported.
 *
 * @phpstan-type UpdateStatus array{
 *     current_version: string,
 *     latest_version: string,
 *     has_update: bool,
 *     channel: string,
 *     changelog: ?string,
 *     manifest_url: ?string,
 *     source: string,
 *     release_name: ?string,
 *     release_url: ?string,
 *     published_at: ?string,
 *     prerelease: bool,
 *     checked_at: string,
 *     error: ?string
 * }
 */
class UpdateCheckerService
{
    public const CACHE_KEY = 'sitekit.updates.status';

    /**
     * Run a fresh update check (no cache).
     *
     * @return UpdateStatus
     */
    public function checkForUpdates(): array
    {
        $currentVersion = $this->currentVersion();
        $channel = (string) config('sitekit.update_channel', 'stable');

        try {
            if ($this->upstreamRepo() !== null) {
                return $this->checkGitHub($currentVersion, $channel);
            }

            if (config('sitekit.manifest_url')) {
                return $this->checkManifest($currentVersion, $channel);
            }

            return $this->status($currentVersion, $channel, [
                'source' => 'none',
                'error' => null,
            ]);
        } catch (Throwable $e) {
            return $this->status($currentVersion, $channel, [
                'source' => $this->upstreamRepo() !== null ? 'github' : 'manifest',
                'manifest_url' => config('sitekit.manifest_url'),
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Return the last check result, running a check if none is cached.
     *
     * @return UpdateStatus
     */
    public function cachedStatus(): array
    {
        $status = Cache::remember(self::CACHE_KEY, (int) config('sitekit.update_check_ttl', 21600), fn (): array => $this->checkForUpdates());

        // The installed version may have changed since the check was cached (after a deploy).
        if (($status['current_version'] ?? null) !== $this->currentVersion()) {
            return $this->refresh();
        }

        return $status;
    }

    /**
     * Force a new check and store it in the cache.
     *
     * @return UpdateStatus
     */
    public function refresh(): array
    {
        $status = $this->checkForUpdates();

        Cache::put(self::CACHE_KEY, $status, (int) config('sitekit.update_check_ttl', 21600));

        return $status;
    }

    public function forget(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    public function currentVersion(): string
    {
        $dbVersion = \App\Models\UpdateHistory::query()
            ->where('status', 'success')
            ->latest('id')
            ->value('to_version');

        $fileVersion = is_file(base_path('VERSION')) ? trim((string) file_get_contents(base_path('VERSION'))) : null;

        $version = $dbVersion ?? $fileVersion ?? (string) config('sitekit.version', '1.0.0');

        return $this->normalizeVersion($version);
    }

    public function normalizeVersion(string $version): string
    {
        return ltrim(trim($version), 'vV');
    }

    /**
     * @return UpdateStatus
     */
    private function checkGitHub(string $currentVersion, string $channel): array
    {
        $repo = (string) $this->upstreamRepo();
        $response = $this->github()->get("/repos/{$repo}/releases", ['per_page' => 30]);

        if (! $response->successful()) {
            throw new RuntimeException("GitHub releases request for [{$repo}] returned HTTP {$response->status()}");
        }

        $includePrereleases = $channel === 'beta';

        $latest = collect((array) $response->json())
            ->filter(fn (mixed $release): bool => is_array($release)
                && empty($release['draft'])
                && ($includePrereleases || empty($release['prerelease']))
                && ! empty($release['tag_name']))
            ->sort(fn (array $a, array $b): int => version_compare(
                $this->normalizeVersion((string) $b['tag_name']),
                $this->normalizeVersion((string) $a['tag_name']),
            ))
            ->first();

        if ($latest === null) {
            return $this->status($currentVersion, $channel, ['source' => 'github', 'error' => null]);
        }

        $latestVersion = $this->normalizeVersion((string) $latest['tag_name']);

        return $this->status($currentVersion, $channel, [
            'latest_version' => $latestVersion,
            'has_update' => version_compare($latestVersion, $currentVersion, '>'),
            'changelog' => $latest['body'] ?? null,
            'source' => 'system',
            'release_name' => $latest['name'] ?? $latest['tag_name'],
            'release_url' => null,
            'published_at' => $latest['published_at'] ?? null,
            'prerelease' => (bool) ($latest['prerelease'] ?? false),
            'error' => null,
        ]);
    }

    /**
     * @return UpdateStatus
     */
    private function checkManifest(string $currentVersion, string $channel): array
    {
        $manifestUrl = (string) config('sitekit.manifest_url');
        $response = Http::timeout(5)->get($manifestUrl);

        if (! $response->successful()) {
            throw new RuntimeException("Update manifest request returned HTTP {$response->status()}");
        }

        $manifest = (array) $response->json();
        $latestVersion = $this->normalizeVersion((string) ($manifest['version'] ?? $currentVersion));

        return $this->status($currentVersion, $channel, [
            'latest_version' => $latestVersion,
            'has_update' => version_compare($latestVersion, $currentVersion, '>'),
            'changelog' => $manifest['changelog'] ?? null,
            'manifest_url' => $manifestUrl,
            'source' => 'manifest',
            'error' => null,
        ]);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return UpdateStatus
     */
    private function status(string $currentVersion, string $channel, array $overrides): array
    {
        return array_merge([
            'current_version' => $currentVersion,
            'latest_version' => $currentVersion,
            'has_update' => false,
            'channel' => $channel,
            'changelog' => null,
            'manifest_url' => null,
            'source' => 'none',
            'release_name' => null,
            'release_url' => null,
            'published_at' => null,
            'prerelease' => false,
            'checked_at' => now()->toIso8601String(),
            'error' => null,
        ], $overrides);
    }

    private function upstreamRepo(): ?string
    {
        $repo = trim((string) config('sitekit.github.upstream_repo'));

        return $repo !== '' ? $repo : null;
    }

    private function github(): PendingRequest
    {
        $request = Http::baseUrl((string) config('sitekit.github.api_url', 'https://api.github.com'))
            ->acceptJson()
            ->withHeaders(['X-GitHub-Api-Version' => '2022-11-28'])
            ->timeout(10);

        $token = (string) config('sitekit.github.token');

        return $token !== '' ? $request->withToken($token) : $request;
    }
}
