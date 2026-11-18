<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Services\Cache\BaseCacheService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SettingsCacheTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        BaseCacheService::flushRuntimeCache();
    }

    public function test_updating_a_setting_refreshes_the_cached_settings_in_the_same_process(): void
    {
        $cache = app(BaseCacheService::class);
        Setting::create(['key' => 'site_phone', 'value' => '111']);

        $this->assertSame('111', $cache->rememberSetting('site_phone'));

        Setting::where('key', 'site_phone')->first()->update(['value' => '222']);

        $this->assertSame('222', $cache->rememberSetting('site_phone'));
    }

    public function test_crm_login_page_renders_site_name_from_cached_settings(): void
    {
        $this->withoutVite();
        Setting::create(['key' => 'site_name', 'value' => ['ar' => 'اسم الموقع', 'en' => 'Test Site']]);

        $response = $this->get(route('crm.login'));

        $response->assertOk()->assertSee('اسم الموقع');
    }
}
