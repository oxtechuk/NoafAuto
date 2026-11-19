<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DeployWebhookTest extends TestCase
{
    use RefreshDatabase;

    public function test_default_login_route_redirects_to_admin_login(): void
    {
        $response = $this->get('/login');

        $response->assertRedirect('/admin/login');
    }

    public function test_deploy_webhook_rejects_request_without_secret(): void
    {
        config(['sitekit.deploy_secret' => 'super-secret-key-123']);

        $response = $this->postJson('/api/v1/system/deploy-webhook');

        $response->assertStatus(401);
    }

    public function test_deploy_webhook_rejects_request_when_secret_not_configured(): void
    {
        config(['sitekit.deploy_secret' => null]);

        $response = $this->postJson('/api/v1/system/deploy-webhook', [
            'secret' => 'any-key',
        ]);

        $response->assertStatus(403);
    }

    public function test_deploy_webhook_executes_when_authorized(): void
    {
        config([
            'sitekit.deploy_secret' => 'test-deploy-secret-key',
            'sitekit.version' => '1.0.0',
        ]);

        $response = $this->postJson('/api/v1/system/deploy-webhook', [
            'pull' => false,
        ], [
            'X-Deploy-Secret' => 'test-deploy-secret-key',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.version', '1.0.0')
            ->assertJsonPath('message', 'Instance updated successfully');

        $this->assertDatabaseHas('update_history', [
            'to_version' => '1.0.0',
            'status' => 'success',
        ]);
    }
}
