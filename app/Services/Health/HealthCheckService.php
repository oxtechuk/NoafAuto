<?php

declare(strict_types=1);

namespace App\Services\Health;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Throwable;

class HealthCheckService
{
    /**
     * Run all health checks and return detailed status.
     *
     * @return array{
     *     healthy: bool,
     *     timestamp: string,
     *     checks: array<string, array{status: string, message: string, details?: mixed}>
     * }
     */
    public function check(): array
    {
        $checks = [
            'php_version' => $this->checkPhp(),
            'database' => $this->checkDatabase(),
            'storage' => $this->checkStorage(),
            'cache' => $this->checkCache(),
        ];

        $healthy = ! in_array('error', array_column($checks, 'status'), true);

        return [
            'healthy' => $healthy,
            'timestamp' => now()->toIso8601String(),
            'checks' => $checks,
        ];
    }

    /**
     * @return array{status: string, message: string, details: string}
     */
    private function checkPhp(): array
    {
        $version = PHP_VERSION;
        $isAcceptable = version_compare($version, '8.2.0', '>=');

        return [
            'status' => $isAcceptable ? 'ok' : 'error',
            'message' => $isAcceptable ? "PHP version {$version} is supported" : "PHP version {$version} is below 8.2",
            'details' => $version,
        ];
    }

    /**
     * @return array{status: string, message: string, details?: mixed}
     */
    private function checkDatabase(): array
    {
        try {
            DB::connection()->getPdo();
            $driver = DB::connection()->getDriverName();

            return [
                'status' => 'ok',
                'message' => "Database connection successful ({$driver})",
                'details' => $driver,
            ];
        } catch (Throwable $e) {
            return [
                'status' => 'error',
                'message' => 'Database connection failed: '.$e->getMessage(),
            ];
        }
    }

    /**
     * @return array{status: string, message: string, details?: mixed}
     */
    private function checkStorage(): array
    {
        $paths = [
            'storage_framework' => storage_path('framework'),
            'storage_logs' => storage_path('logs'),
            'storage_app' => storage_path('app'),
        ];

        $unwritable = [];

        foreach ($paths as $label => $path) {
            if (! is_dir($path) || ! is_writable($path)) {
                $unwritable[] = $label;
            }
        }

        if (! empty($unwritable)) {
            return [
                'status' => 'error',
                'message' => 'Some storage directories are not writable: '.implode(', ', $unwritable),
                'details' => $unwritable,
            ];
        }

        return [
            'status' => 'ok',
            'message' => 'All storage directories are writable',
        ];
    }

    /**
     * @return array{status: string, message: string}
     */
    private function checkCache(): array
    {
        try {
            $key = 'sitekit_health_probe_'.uniqid();
            Cache::put($key, 'probe_value', 10);
            $retrieved = Cache::get($key);
            Cache::forget($key);

            if ($retrieved !== 'probe_value') {
                return [
                    'status' => 'error',
                    'message' => 'Cache write succeeded but read returned unexpected value',
                ];
            }

            return [
                'status' => 'ok',
                'message' => 'Cache driver is responsive',
            ];
        } catch (Throwable $e) {
            return [
                'status' => 'error',
                'message' => 'Cache failure: '.$e->getMessage(),
            ];
        }
    }
}
