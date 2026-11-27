<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Setting;
use App\Services\Storefront\StorefrontManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StoreShellBootTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    public function test_store_page_inlines_settings_for_the_spa(): void
    {
        Setting::create(['key' => 'contact_phone', 'value' => '920000000']);

        $html = $this->get(route('store.home'))->assertOk()->getContent();

        $this->assertMatchesRegularExpression('/window\.__BOOT_SETTINGS__ = (\{.*\});/', $html);
        preg_match('/window\.__BOOT_SETTINGS__ = (\{.*\});/', $html, $matches);
        $boot = json_decode($matches[1], true);

        $this->assertSame(app()->getLocale(), $boot['locale']);
        $this->assertIsArray($boot['data']);
    }

    public function test_inlined_settings_match_the_settings_api(): void
    {
        $html = $this->get(route('store.home'))->assertOk()->getContent();
        preg_match('/window\.__BOOT_SETTINGS__ = (\{.*\});/', $html, $matches);
        $boot = json_decode($matches[1], true);

        $api = $this->getJson(route('v1.store.api.settings.footer'))->assertOk()->json('data');

        $this->assertEquals($api, $boot['data']);
    }

    public function test_inlined_settings_cannot_break_out_of_the_script_tag(): void
    {
        Setting::create(['key' => 'footer_text', 'value' => '</script><script>alert(1)</script>']);

        $html = $this->get(route('store.home'))->assertOk()->getContent();

        $this->assertStringNotContainsString('<script>alert(1)</script>', $html);
    }

    public function test_store_page_renders_the_boot_skeleton_inside_root(): void
    {
        config(['sitekit.storefront.enabled' => false]);

        $this->get(route('store.home'))
            ->assertOk()
            ->assertSee('<div id="root">', false)
            ->assertSee('class="boot-sk"', false);
    }

    public function test_external_storefront_does_not_get_the_boot_skeleton(): void
    {
        config(['sitekit.storefront.enabled' => true]);
        $this->app->forgetInstance(StorefrontManager::class);

        if (! app(StorefrontManager::class)->isActive()) {
            $this->markTestSkipped('No built storefront in this environment.');
        }

        $this->get(route('store.home'))
            ->assertOk()
            ->assertDontSee('class="boot-sk"', false);
    }

    public function test_storefront_homepage_inlines_the_home_api_payload(): void
    {
        config(['sitekit.storefront.enabled' => true]);

        $html = $this->get(route('store.home'))->assertOk()->getContent();

        $this->assertMatchesRegularExpression('/window\.__BOOT_HOME__ = (\{.*\});/', $html);
        preg_match('/window\.__BOOT_HOME__ = (\{.*\});/', $html, $matches);
        $boot = json_decode($matches[1], true);

        $api = $this->getJson(route('v1.store.api.home'))->assertOk()->json('data');

        $this->assertSame(app()->getLocale(), $boot['locale']);
        $this->assertEquals($api, $boot['data']);
    }

    public function test_home_payload_is_not_inlined_without_the_storefront(): void
    {
        config(['sitekit.storefront.enabled' => false]);

        $html = $this->get(route('store.home'))->assertOk()->getContent();

        $this->assertStringNotContainsString('__BOOT_HOME__', $html);
    }

    public function test_home_payload_is_only_inlined_on_the_homepage(): void
    {
        config(['sitekit.storefront.enabled' => true]);

        $html = $this->get(route('store.cars'))->assertOk()->getContent();

        $this->assertStringNotContainsString('__BOOT_HOME__', $html);
    }

    public function test_not_found_page_still_renders_without_boot_settings(): void
    {
        $response = $this->get('/this-page-does-not-exist')->assertNotFound();

        $this->assertStringNotContainsString('__BOOT_SETTINGS__', $response->getContent());
    }
}
