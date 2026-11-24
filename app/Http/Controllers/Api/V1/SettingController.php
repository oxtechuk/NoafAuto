<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Api\Contracts\ApiResponse;
use App\Http\Api\Response\Builder\ApiResponseBuilder;
use App\Http\Controllers\Api\ApiBaseController;
use App\Http\Requests\Api\V1\Settings\SettingUpdateRequest;
use App\Models\Setting;
use App\Services\Cache\BaseCacheService;
use App\Services\ImageOptimizerService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

class SettingController extends ApiBaseController
{
    public function __construct(
        ApiResponseBuilder $responseBuilder,
        private readonly BaseCacheService $cacheService,
        private readonly ImageOptimizerService $imageOptimizer,
    ) {
        parent::__construct($responseBuilder);
    }

    public function index(): ApiResponse
    {
        Gate::authorize('viewAny', Setting::class);

        $settings = Cache::remember('crm_settings_all', 3600, fn () => Setting::all()->pluck('value', 'key'));

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

        $settings = $request->input('settings');
        if (is_string($settings)) {
            $settings = json_decode($settings, true) ?: [];
        }
        if (! is_array($settings)) {
            $settings = $request->except([
                '_method', '_token', 'site_logo', 'footer_logo', 'site_favicon',
                'admin_login_bg', 'admin_login_logo', 'admin_sidebar_logo',
                'breadcrumb_bg', 'popup_image', 'page_loader_image',
                'default_car_image', 'request_car_icon',
                'hero_ad_1_image', 'hero_ad_2_image', 'cars_hero_image',
                'offers_hero_image', 'offers_hero_image_mobile', 'booking_hero_image',
                'main_gallery', 'delete_gallery_image',
            ]);
        }

        foreach ($settings as $key => $value) {
            Setting::updateOrCreate(
                ['key' => (string) $key],
                ['value' => $value]
            );
        }

        // Standalone file keys
        $standaloneFiles = [
            'site_logo' => ['folder' => 'settings', 'maxWidth' => 1600, 'quality' => 85],
            'footer_logo' => ['folder' => 'settings', 'maxWidth' => 1600, 'quality' => 85],
            'site_favicon' => ['folder' => 'settings', 'maxWidth' => 512, 'quality' => 90],
            'admin_login_bg' => ['folder' => 'settings', 'maxWidth' => 1920, 'quality' => 85],
            'admin_login_logo' => ['folder' => 'settings', 'maxWidth' => 1600, 'quality' => 85],
            'admin_sidebar_logo' => ['folder' => 'settings', 'maxWidth' => 1600, 'quality' => 85],
            'breadcrumb_bg' => ['folder' => 'settings', 'maxWidth' => 1920, 'quality' => 85],
            'page_loader_image' => ['folder' => 'settings', 'maxWidth' => 800, 'quality' => 90],
            'default_car_image' => ['folder' => 'settings', 'maxWidth' => 1600, 'quality' => 85],
            'request_car_icon' => ['folder' => 'settings', 'maxWidth' => 512, 'quality' => 90],
            'hero_ad_1_image' => ['folder' => 'settings', 'maxWidth' => 1600, 'quality' => 85],
            'hero_ad_2_image' => ['folder' => 'settings', 'maxWidth' => 1600, 'quality' => 85],
        ];

        foreach ($standaloneFiles as $fileKey => $opts) {
            if ($request->hasFile($fileKey)) {
                $path = $this->imageOptimizer->storeAndOptimize(
                    $request->file($fileKey),
                    $opts['folder'],
                    ['maxWidth' => $opts['maxWidth'], 'quality' => $opts['quality']]
                );
                Setting::updateOrCreate(['key' => $fileKey], ['value' => $path]);
            }
        }

        // Cars hero image
        if ($request->hasFile('cars_hero_image')) {
            $path = $this->imageOptimizer->storeAndOptimize(
                $request->file('cars_hero_image'),
                'settings/cars',
                ['maxWidth' => 1920, 'quality' => 82]
            );
            $record = Setting::where('key', 'store_hero')->first()?->value;
            $carsHero = is_array($record) ? $record : (is_string($record) ? (json_decode($record, true) ?: []) : []);
            $carsHero['image'] = $path;
            Setting::updateOrCreate(['key' => 'store_hero'], ['value' => $carsHero]);
        }

        // Offers hero desktop image
        if ($request->hasFile('offers_hero_image')) {
            $path = $this->imageOptimizer->storeAndOptimize(
                $request->file('offers_hero_image'),
                'settings/offers',
                ['maxWidth' => 1920, 'quality' => 85]
            );
            $record = Setting::where('key', 'store_offers_hero')->first()?->value;
            $offersHero = is_array($record) ? $record : (is_string($record) ? (json_decode($record, true) ?: []) : []);
            $offersHero['image'] = $path;
            Setting::updateOrCreate(['key' => 'store_offers_hero'], ['value' => $offersHero]);
        }

        // Offers hero mobile image
        if ($request->hasFile('offers_hero_image_mobile')) {
            $path = $this->imageOptimizer->storeAndOptimize(
                $request->file('offers_hero_image_mobile'),
                'settings/offers',
                ['maxWidth' => 1080, 'quality' => 85]
            );
            $record = Setting::where('key', 'store_offers_hero')->first()?->value;
            $offersHero = is_array($record) ? $record : (is_string($record) ? (json_decode($record, true) ?: []) : []);
            $offersHero['image_mobile'] = $path;
            Setting::updateOrCreate(['key' => 'store_offers_hero'], ['value' => $offersHero]);
        }

        // Booking hero image
        if ($request->hasFile('booking_hero_image')) {
            $path = $this->imageOptimizer->storeAndOptimize(
                $request->file('booking_hero_image'),
                'settings/booking',
                ['maxWidth' => 1920, 'quality' => 82]
            );
            $record = Setting::where('key', 'store_booking_hero')->first()?->value;
            $bookingHero = is_array($record) ? $record : (is_string($record) ? (json_decode($record, true) ?: []) : []);
            $bookingHero['image'] = $path;
            Setting::updateOrCreate(['key' => 'store_booking_hero'], ['value' => $bookingHero]);
        }

        // Popup image
        if ($request->hasFile('popup_image')) {
            $path = $this->imageOptimizer->storeAndOptimize(
                $request->file('popup_image'),
                'settings/popup',
                ['maxWidth' => 1200, 'quality' => 82]
            );
            $record = Setting::where('key', 'promo_popup')->first()?->value;
            $popup = is_array($record) ? $record : (is_string($record) ? (json_decode($record, true) ?: []) : []);
            $popup['image'] = $path;
            Setting::updateOrCreate(['key' => 'promo_popup'], ['value' => $popup]);
        }

        // Main gallery multiple files
        if ($request->hasFile('main_gallery')) {
            $record = Setting::where('key', 'main_gallery')->first()?->value;
            $gallery = is_array($record) ? $record : (is_string($record) ? (json_decode($record, true) ?: []) : []);
            foreach ($request->file('main_gallery') as $img) {
                $path = $this->imageOptimizer->storeAndOptimize(
                    $img,
                    'settings/gallery',
                    ['maxWidth' => 1600, 'quality' => 82]
                );
                $gallery[] = $path;
            }
            Setting::updateOrCreate(['key' => 'main_gallery'], ['value' => $gallery]);
        }

        // Delete gallery image
        if ($request->filled('delete_gallery_image')) {
            $del = (string) $request->input('delete_gallery_image');
            $record = Setting::where('key', 'main_gallery')->first()?->value;
            $gallery = is_array($record) ? $record : (is_string($record) ? (json_decode($record, true) ?: []) : []);
            if (is_array($gallery)) {
                $gallery = array_values(array_filter($gallery, fn ($p) => $p !== $del));
                Setting::updateOrCreate(['key' => 'main_gallery'], ['value' => $gallery]);
                if (Storage::disk('public')->exists($del)) {
                    Storage::disk('public')->delete($del);
                }
            }
        }

        Cache::forget('settings.hero.store_booking_hero');
        Cache::forget('settings.hero.store_hero');
        Cache::forget('settings.hero.store_offers_hero');
        Cache::forget('crm_settings_all');
        $this->cacheService->forgetSettings();

        $allSettings = Setting::all()->pluck('value', 'key');

        return $this->respondSuccess($allSettings, 'Settings updated successfully');
    }
}
