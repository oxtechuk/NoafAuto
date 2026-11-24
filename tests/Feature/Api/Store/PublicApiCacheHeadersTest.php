<?php

declare(strict_types=1);

namespace Tests\Feature\Api\Store;

use App\Models\Car;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicApiCacheHeadersTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_listing_is_cacheable_and_varies_by_language(): void
    {
        $response = $this->getJson(route('v1.store.api.cars.index'))->assertOk();

        $cacheControl = (string) $response->headers->get('Cache-Control');
        $this->assertStringContainsString('public', $cacheControl);
        $this->assertStringContainsString('max-age=60', $cacheControl);
        $this->assertStringContainsString('stale-while-revalidate=300', $cacheControl);
        $this->assertContains('Accept-Language', $response->getVary());
    }

    public function test_route_specific_max_age_is_applied(): void
    {
        $response = $this->getJson(route('v1.store.api.settings.footer'))->assertOk();

        $this->assertStringContainsString('max-age=300', (string) $response->headers->get('Cache-Control'));
    }

    public function test_legacy_prefix_is_cached_too(): void
    {
        $response = $this->getJson(route('store.api.brands.index'))->assertOk();

        $this->assertStringContainsString('public', (string) $response->headers->get('Cache-Control'));
    }

    public function test_car_details_are_not_cached_so_views_stay_accurate(): void
    {
        $car = Car::factory()->create();

        $response = $this->getJson(route('v1.store.api.cars.show', $car->getTranslation('slug', 'ar')))->assertOk();

        $this->assertStringNotContainsString('public', (string) $response->headers->get('Cache-Control'));
    }

    public function test_error_responses_are_not_cached(): void
    {
        $response = $this->getJson(route('v1.store.api.blog.show', 'does-not-exist'));

        $this->assertNotSame(200, $response->getStatusCode());
        $this->assertStringNotContainsString('public', (string) $response->headers->get('Cache-Control'));
    }

    public function test_authenticated_requests_are_not_marked_public(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer something')
            ->getJson(route('v1.store.api.cars.index'))
            ->assertOk();

        $this->assertStringNotContainsString('public', (string) $response->headers->get('Cache-Control'));
    }

    public function test_form_submissions_are_not_cached(): void
    {
        $response = $this->postJson(route('v1.store.api.newsletter.store'), []);

        $this->assertStringNotContainsString('public', (string) $response->headers->get('Cache-Control'));
    }
}
