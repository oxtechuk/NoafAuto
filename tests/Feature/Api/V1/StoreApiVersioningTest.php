<?php

namespace Tests\Feature\Api\V1;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class StoreApiVersioningTest extends TestCase
{
    use RefreshDatabase;

    public function test_store_api_is_served_under_v1_without_deprecation_headers(): void
    {
        $response = $this->getJson('/api/v1/store/faqs');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertHeaderMissing('Deprecation');
    }

    public function test_legacy_store_api_still_works_and_points_to_v1(): void
    {
        $response = $this->getJson('/api/store/faqs');

        $response->assertOk()
            ->assertHeader('Deprecation', 'true')
            ->assertHeader('Link', '</api/v1/store/faqs>; rel="successor-version"');
    }

    public function test_v1_store_routes_are_named_with_v1_prefix(): void
    {
        $this->assertSame(url('/api/v1/store/faqs'), route('v1.store.api.faqs'));
        $this->assertSame(url('/api/store/faqs'), route('store.api.faqs'));
    }

    public function test_every_response_gets_a_generated_request_id(): void
    {
        $requestId = $this->getJson('/api/v1/health')->headers->get('X-Request-Id');

        $this->assertTrue(Str::isUuid($requestId));
    }

    public function test_a_valid_incoming_request_id_is_propagated(): void
    {
        $this->getJson('/api/v1/health', ['X-Request-Id' => 'lb-trace-12345678'])
            ->assertHeader('X-Request-Id', 'lb-trace-12345678');
    }

    public function test_an_unsafe_incoming_request_id_is_replaced(): void
    {
        $requestId = $this->getJson('/api/v1/health', ['X-Request-Id' => "bad id\n<script>"])
            ->headers->get('X-Request-Id');

        $this->assertTrue(Str::isUuid($requestId));
    }

    public function test_error_responses_also_carry_a_request_id(): void
    {
        $this->getJson('/api/v1/does-not-exist')
            ->assertNotFound()
            ->assertHeader('X-Request-Id');
    }
}
