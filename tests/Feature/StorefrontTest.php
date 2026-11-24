<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Services\Storefront\StorefrontManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class StorefrontTest extends TestCase
{
    use RefreshDatabase;

    private string $publicPath;

    private const BUILT_INDEX = <<<'HTML'
        <!doctype html>
        <html lang="ar" dir="rtl">
          <head>
            <meta charset="UTF-8" />
            <link rel="icon" type="image/png" href="/storefront/images/logo-dark.png" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link href="https://fonts.googleapis.com/css2?family=Tajawal&display=swap" rel="stylesheet" />
            <title>Nawaf Auto</title>
            <script type="module" crossorigin src="/storefront/assets/index-abc123.js"></script>
            <link rel="stylesheet" crossorigin href="/storefront/assets/index-abc123.css">
          </head>
          <body>
            <div id="app"></div>
          </body>
        </html>
        HTML;

    protected function setUp(): void
    {
        parent::setUp();

        $this->publicPath = storage_path('framework/testing/storefront-'.uniqid());
        config([
            'sitekit.storefront.public_path' => $this->publicPath,
            'sitekit.storefront.enabled' => true,
        ]);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->publicPath);

        parent::tearDown();
    }

    public function test_parse_keeps_asset_tags_and_drops_shell_owned_tags(): void
    {
        $data = app(StorefrontManager::class)->parse(self::BUILT_INDEX);

        $this->assertStringContainsString('/storefront/assets/index-abc123.js', $data['head']);
        $this->assertStringContainsString('/storefront/assets/index-abc123.css', $data['head']);
        $this->assertStringContainsString('family=Tajawal', $data['head']);
        $this->assertStringNotContainsString('<title>', $data['head']);
        $this->assertStringNotContainsString('rel="icon"', $data['head']);
        $this->assertStringNotContainsString('charset', $data['head']);
        $this->assertSame('app', $data['root_id']);
    }

    public function test_store_pages_serve_built_storefront_with_server_side_seo(): void
    {
        $this->withoutVite();
        $this->publishIndex();

        $this->get('/')
            ->assertOk()
            ->assertSee('/storefront/assets/index-abc123.js', false)
            ->assertSee('<div id="app">', false)
            ->assertSee('og:title', false)
            ->assertDontSee('resources/react/main.tsx', false);
    }

    public function test_unknown_pages_still_return_404_with_storefront(): void
    {
        $this->withoutVite();
        $this->publishIndex();

        $this->get('/this-page-does-not-exist')
            ->assertNotFound()
            ->assertSee('/storefront/assets/index-abc123.js', false);
    }

    public function test_bundled_store_is_used_when_storefront_disabled(): void
    {
        config(['sitekit.storefront.enabled' => false]);
        $this->publishIndex();

        $this->assertFalse(app(StorefrontManager::class)->isActive());
        $this->assertNull(app(StorefrontManager::class)->viewData());
    }

    public function test_bundled_store_is_used_when_storefront_not_built(): void
    {
        $this->assertFalse(app(StorefrontManager::class)->isActive());
    }

    public function test_build_command_fails_without_package_json(): void
    {
        $this->artisan('sitekit:storefront:build', ['--path' => storage_path('framework/testing/missing-storefront')])
            ->expectsOutputToContain('No package.json found')
            ->assertFailed();
    }

    private function publishIndex(): void
    {
        File::ensureDirectoryExists($this->publicPath);
        File::put($this->publicPath.'/index.html', self::BUILT_INDEX);
    }
}
