<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ImageThumbnailTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        Storage::fake('thumbs');
    }

    public function test_thumbnail_is_generated_resized_and_stored(): void
    {
        Storage::disk('public')->put('cars/car.jpg', UploadedFile::fake()->image('car.jpg', 1600, 900)->getContent());

        $response = $this->get('/thumbs/480/cars/car.jpg.webp');

        $response->assertOk()->assertHeader('Content-Type', 'image/webp');
        $this->assertStringContainsString('public', (string) $response->headers->get('Cache-Control'));
        $this->assertNull($response->headers->get('Set-Cookie'));

        Storage::disk('thumbs')->assertExists('480/cars/car.jpg.webp');
        [$width] = getimagesizefromstring(Storage::disk('thumbs')->get('480/cars/car.jpg.webp'));
        $this->assertSame(480, $width);
    }

    public function test_small_images_are_not_upscaled(): void
    {
        Storage::disk('public')->put('cars/small.png', UploadedFile::fake()->image('small.png', 200, 100)->getContent());

        $this->get('/thumbs/768/cars/small.png.webp')->assertOk();

        [$width] = getimagesizefromstring(Storage::disk('thumbs')->get('768/cars/small.png.webp'));
        $this->assertSame(200, $width);
    }

    public function test_existing_thumbnail_is_reused(): void
    {
        Storage::disk('public')->put('cars/car.jpg', UploadedFile::fake()->image('car.jpg', 1000, 500)->getContent());
        Storage::disk('thumbs')->put('320/cars/car.jpg.webp', 'cached-bytes');

        $this->get('/thumbs/320/cars/car.jpg.webp')->assertOk();

        $this->assertSame('cached-bytes', Storage::disk('thumbs')->get('320/cars/car.jpg.webp'));
    }

    public function test_unsupported_width_is_not_routed(): void
    {
        Storage::disk('public')->put('cars/car.jpg', UploadedFile::fake()->image('car.jpg', 1000, 500)->getContent());

        $this->get('/thumbs/999/cars/car.jpg.webp')->assertNotFound();
        Storage::disk('thumbs')->assertMissing('999/cars/car.jpg.webp');
    }

    public function test_missing_source_returns_404(): void
    {
        $this->get('/thumbs/480/cars/nope.jpg.webp')->assertNotFound();
    }

    public function test_path_traversal_is_rejected(): void
    {
        $this->get('/thumbs/480/..%2F..%2F.env.jpg.webp')->assertNotFound();
        $this->get('/thumbs/480/cars/../../secret.jpg.webp')->assertNotFound();
    }

    public function test_non_image_files_are_rejected(): void
    {
        Storage::disk('public')->put('docs/file.pdf', 'pdf');

        $this->get('/thumbs/480/docs/file.pdf.webp')->assertNotFound();
    }

    public function test_webp_sources_from_the_uploader_are_supported(): void
    {
        $image = imagecreatetruecolor(1200, 600);
        ob_start();
        imagewebp($image);
        Storage::disk('public')->put('cars/uploaded.webp', (string) ob_get_clean());

        $this->get('/thumbs/320/cars/uploaded.webp.webp')->assertOk();

        [$width] = getimagesizefromstring(Storage::disk('thumbs')->get('320/cars/uploaded.webp.webp'));
        $this->assertSame(320, $width);
    }

    public function test_store_catch_all_does_not_swallow_thumbnail_urls(): void
    {
        $this->get('/thumbs/480/cars/nope.jpg.webp')->assertNotFound()->assertDontSee('id="root"', false);
    }

    public function test_corrupt_image_falls_back_to_the_original(): void
    {
        Storage::disk('public')->put('cars/broken.jpg', 'not really an image');

        $this->get('/thumbs/480/cars/broken.jpg.webp')
            ->assertRedirect(asset('storage/cars/broken.jpg'));
    }
}
