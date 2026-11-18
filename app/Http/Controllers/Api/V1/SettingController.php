<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Api\Contracts\ApiResponse;
use App\Http\Api\Response\Builder\ApiResponseBuilder;
use App\Http\Controllers\Api\ApiBaseController;
use App\Http\Requests\Api\V1\Settings\SettingUpdateRequest;
use App\Models\Setting;
use App\Services\Cache\BaseCacheService;
use Illuminate\Support\Facades\Gate;

class SettingController extends ApiBaseController
{
    public function __construct(
        ApiResponseBuilder $responseBuilder,
        private readonly BaseCacheService $cacheService,
    ) {
        parent::__construct($responseBuilder);
    }

    public function index(): ApiResponse
    {
        Gate::authorize('viewAny', Setting::class);

        $settings = Setting::all()->pluck('value', 'key');

        return $this->respondSuccess($settings, 'Settings retrieved successfully');
    }

    public function show(string $key): ApiResponse
    {
        Gate::authorize('viewAny', Setting::class);

        $setting = Setting::where('key', $key)->first();

        return $this->respondSuccess([
            'key' => $key,
            'value' => $setting?->value,
        ]);
    }

    public function update(SettingUpdateRequest $request): ApiResponse
    {
        Gate::authorize('update', Setting::class);

        $settings = (array) $request->validated('settings');

        foreach ($settings as $key => $value) {
            Setting::updateOrCreate(
                ['key' => (string) $key],
                ['value' => $value]
            );
        }

        $this->cacheService->forgetSettings();

        $allSettings = Setting::all()->pluck('value', 'key');

        return $this->respondSuccess($allSettings, 'Settings updated successfully');
    }
}
