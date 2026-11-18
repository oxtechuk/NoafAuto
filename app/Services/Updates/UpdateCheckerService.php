<?php

declare(strict_types=1);

namespace App\Services\Updates;

use Illuminate\Support\Facades\Http;
use Throwable;

class UpdateCheckerService
{
    /**
     * Check if a new version is available.
     *
     * @return array{
     *     current_version: string,
     *     latest_version: string,
     *     has_update: bool,
     *     channel: string,
     *     changelog: ?string,
     *     manifest_url: ?string,
     *     error: ?string
     * }
     */
    public function checkForUpdates(): array
    {
        $currentVersion = (string) config('sitekit.version', '0.1.0');
        $channel = (string) config('sitekit.update_channel', 'stable');
        $manifestUrl = config('sitekit.manifest_url');

        if (! $manifestUrl) {
            // Local fallback / default manifest definition
            $mockLatest = '1.0.0';
            $hasUpdate = version_compare($mockLatest, $currentVersion, '>');

            return [
                'current_version' => $currentVersion,
                'latest_version' => $mockLatest,
                'has_update' => $hasUpdate,
                'channel' => $channel,
                'changelog' => 'Sitekit v1.0.0 LTS: Core architecture overhaul, unified API v1, React Admin SPA, and decoupled modules system.',
                'manifest_url' => null,
                'error' => null,
            ];
        }

        try {
            $response = Http::timeout(5)->get($manifestUrl);

            if (! $response->successful()) {
                throw new \RuntimeException("Update manifest request returned HTTP {$response->status()}");
            }

            $manifest = (array) $response->json();
            $latestVersion = (string) ($manifest['version'] ?? $currentVersion);
            $hasUpdate = version_compare($latestVersion, $currentVersion, '>');

            return [
                'current_version' => $currentVersion,
                'latest_version' => $latestVersion,
                'has_update' => $hasUpdate,
                'channel' => $channel,
                'changelog' => $manifest['changelog'] ?? null,
                'manifest_url' => $manifestUrl,
                'error' => null,
            ];
        } catch (Throwable $e) {
            return [
                'current_version' => $currentVersion,
                'latest_version' => $currentVersion,
                'has_update' => false,
                'channel' => $channel,
                'changelog' => null,
                'manifest_url' => $manifestUrl,
                'error' => $e->getMessage(),
            ];
        }
    }
}
