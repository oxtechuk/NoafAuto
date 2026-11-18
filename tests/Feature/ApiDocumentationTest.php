<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiDocumentationTest extends TestCase
{
    use RefreshDatabase;

    public function test_api_documentation_page_loads_successfully(): void
    {
        $response = $this->get('/docs/api');

        $response->assertStatus(200);
    }

    public function test_api_openapi_json_specification_loads_successfully(): void
    {
        $response = $this->get('/docs/api.json');

        $response->assertStatus(200)
            ->assertHeader('Content-Type', 'application/json');
    }
}
