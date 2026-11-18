<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Api\Contracts\ApiResponse;
use App\Http\Controllers\Api\ApiBaseController;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

class SystemController extends ApiBaseController
{
    /**
     * Report the health of the application's core services.
     */
    public function health(): ApiResponse
    {
        $checks = [
            'database' => $this->databaseIsHealthy(),
            'cache' => $this->cacheIsHealthy(),
        ];

        $isHealthy = ! in_array(false, $checks, true);

        return $this->respond(
            data: [
                'status' => $isHealthy ? 'ok' : 'degraded',
                'checks' => array_map(fn (bool $passed): string => $passed ? 'ok' : 'failed', $checks),
            ],
            message: $isHealthy ? 'System is healthy' : 'System is degraded',
            status: $isHealthy ? 200 : 503,
        );
    }

    /**
     * Return public system information.
     */
    public function info(): ApiResponse
    {
        return $this->respondSuccess([
            'name' => config('app.name'),
            'version' => config('sitekit.version'),
            'update_channel' => config('sitekit.update_channel'),
            'locale' => app()->getLocale(),
            'supported_locales' => ['ar', 'en'],
        ]);
    }

    /**
     * Return semantic version for frontend cache/chunk invalidation.
     */
    public function version(): ApiResponse
    {
        return $this->respondSuccess([
            'version' => config('sitekit.version'),
            'channel' => config('sitekit.update_channel'),
            'timestamp' => now()->timestamp,
        ]);
    }

    private function databaseIsHealthy(): bool
    {
        try {
            DB::connection()->getPdo();

            return true;
        } catch (Throwable) {
            return false;
        }
    }

    private function cacheIsHealthy(): bool
    {
        try {
            $key = 'sitekit:health:'.Str::random(8);
            Cache::put($key, true, 10);
            $isReadable = Cache::get($key) === true;
            Cache::forget($key);

            return $isReadable;
        } catch (Throwable) {
            return false;
        }
    }
}
