<?php

namespace Tests\Feature\Api;

use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

class ApiErrorStatusTest extends TestCase
{
    public function test_unauthenticated_api_request_returns_401(): void
    {
        $this->getJson('/api/v1/auth/me')
            ->assertUnauthorized();
    }

    public function test_unknown_api_route_returns_404(): void
    {
        $this->getJson('/api/does-not-exist')
            ->assertNotFound()
            ->assertJsonPath('success', false);
    }

    public function test_validation_exception_returns_422_with_errors(): void
    {
        $this->app['router']->post('/api/test-validation', function () {
            Validator::make([], ['email' => 'required'])->validate();
        });

        $this->postJson('/api/test-validation')
            ->assertUnprocessable()
            ->assertJsonPath('success', false)
            ->assertJsonValidationErrors('email');
    }

    public function test_forbidden_returns_403(): void
    {
        $this->app['router']->get('/api/test-forbidden', fn () => abort(403));

        $this->getJson('/api/test-forbidden')->assertForbidden();
    }

    public function test_http_response_exception_keeps_its_own_status(): void
    {
        $this->app['router']->get('/api/test-response-exception', function () {
            throw new HttpResponseException(response()->json(['message' => 'custom'], 409));
        });

        $this->getJson('/api/test-response-exception')
            ->assertConflict()
            ->assertJsonPath('message', 'custom');
    }

    public function test_unexpected_exception_returns_500_without_internal_details_in_production(): void
    {
        config(['app.debug' => false]);
        $this->app['router']->get('/api/test-crash', fn () => throw new \RuntimeException('secret internals'));

        $this->getJson('/api/test-crash')
            ->assertServerError()
            ->assertJsonPath('message', 'Internal server error')
            ->assertDontSee('secret internals');
    }
}
