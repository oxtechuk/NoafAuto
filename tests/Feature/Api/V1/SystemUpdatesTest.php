<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Models\Employee;
use App\Models\UpdateHistory;
use App\Services\Updates\UpdateCheckerService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class SystemUpdatesTest extends TestCase
{
    use RefreshDatabase;

    private const SECRET = 'test-deploy-secret';

    private Employee $admin;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'sitekit.version' => '1.0.0',
            'sitekit.update_channel' => 'stable',
            'sitekit.github.upstream_repo' => 'oxtech/sitekit',
            'sitekit.github.client_repo' => 'client/noauf-site',
            'sitekit.github.client_branch' => 'main',
            'sitekit.github.token' => 'ghp_test',
            'sitekit.github.update_workflow' => 'sitekit-update.yml',
            'sitekit.deploy_secret' => self::SECRET,
        ]);

        Http::preventStrayRequests();

        $this->admin = Employee::factory()->admin()->create();
    }

    public function test_guest_and_non_admin_cannot_view_updates(): void
    {
        $this->getJson(route('api.v1.system.updates.index'))->assertUnauthorized();

        $this->actingAs(Employee::factory()->create(), 'employee')
            ->getJson(route('api.v1.system.updates.index'))
            ->assertForbidden();
    }

    public function test_admin_sees_newer_stable_release_from_github(): void
    {
        $this->fakeReleases();

        $this->actingAs($this->admin, 'employee')
            ->getJson(route('api.v1.system.updates.index'))
            ->assertOk()
            ->assertJsonPath('data.source', 'github')
            ->assertJsonPath('data.current_version', '1.0.0')
            ->assertJsonPath('data.latest_version', '1.2.0')
            ->assertJsonPath('data.has_update', true)
            ->assertJsonPath('data.changelog', 'Faster dashboard')
            ->assertJsonPath('data.can_install', true)
            ->assertJsonPath('data.configuration.auto_update_ready', true);
    }

    public function test_beta_channel_includes_prereleases(): void
    {
        config(['sitekit.update_channel' => 'beta']);
        $this->fakeReleases();

        $status = app(UpdateCheckerService::class)->checkForUpdates();

        $this->assertSame('1.3.0-beta.1', $status['latest_version']);
        $this->assertTrue($status['prerelease']);
    }

    public function test_no_update_when_running_latest_version(): void
    {
        config(['sitekit.version' => '1.2.0']);
        $this->fakeReleases();

        $status = app(UpdateCheckerService::class)->checkForUpdates();

        $this->assertFalse($status['has_update']);
        $this->assertSame('1.2.0', $status['latest_version']);
    }

    public function test_github_error_is_reported_without_update(): void
    {
        Http::fake(['api.github.com/*' => Http::response(['message' => 'Not Found'], 404)]);

        $status = app(UpdateCheckerService::class)->checkForUpdates();

        $this->assertFalse($status['has_update']);
        $this->assertStringContainsString('HTTP 404', (string) $status['error']);
    }

    public function test_install_dispatches_client_repo_workflow(): void
    {
        $this->fakeReleases();

        $response = $this->actingAs($this->admin, 'employee')
            ->postJson(route('api.v1.system.updates.install'), ['version' => '1.2.0'])
            ->assertStatus(202)
            ->assertJsonPath('data.status', 'queued')
            ->assertJsonPath('data.to_version', '1.2.0');

        $updateId = $response->json('data.id');

        Http::assertSent(function (HttpRequest $request) use ($updateId): bool {
            return $request->method() === 'POST'
                && str_ends_with($request->url(), '/repos/client/noauf-site/actions/workflows/sitekit-update.yml/dispatches')
                && $request['ref'] === 'main'
                && $request['inputs']['version'] === 'v1.2.0'
                && $request['inputs']['update_id'] === (string) $updateId
                && $request['inputs']['callback_url'] === route('api.v1.system.updates.callback')
                && $request->hasHeader('Authorization', 'Bearer ghp_test');
        });

        $this->assertDatabaseHas('update_history', [
            'id' => $updateId,
            'source' => 'github',
            'triggered_by' => $this->admin->id,
        ]);
    }

    public function test_install_rejects_version_that_is_not_the_available_update(): void
    {
        $this->fakeReleases();

        $this->actingAs($this->admin, 'employee')
            ->postJson(route('api.v1.system.updates.install'), ['version' => '9.9.9'])
            ->assertStatus(422);

        $this->assertDatabaseCount('update_history', 0);
    }

    public function test_install_rejects_while_another_update_is_running(): void
    {
        $this->fakeReleases();
        UpdateHistory::create(['to_version' => '1.1.0', 'status' => 'running', 'source' => 'github', 'started_at' => now()]);

        $this->actingAs($this->admin, 'employee')
            ->postJson(route('api.v1.system.updates.install'), ['version' => '1.2.0'])
            ->assertStatus(409);
    }

    public function test_stale_running_update_is_marked_failed_and_install_allowed(): void
    {
        $this->fakeReleases();
        $stale = UpdateHistory::create(['to_version' => '1.1.0', 'status' => 'running', 'source' => 'github', 'started_at' => now()->subHours(5)]);
        UpdateHistory::whereKey($stale->id)->update(['updated_at' => now()->subHours(5)]);

        $this->actingAs($this->admin, 'employee')
            ->postJson(route('api.v1.system.updates.install'), ['version' => '1.2.0'])
            ->assertStatus(202);

        $this->assertSame('failed', $stale->fresh()->status);
    }

    public function test_install_requires_github_configuration(): void
    {
        config(['sitekit.github.client_repo' => null]);
        $this->fakeReleases();

        $this->actingAs($this->admin, 'employee')
            ->postJson(route('api.v1.system.updates.install'), ['version' => '1.2.0'])
            ->assertStatus(503)
            ->assertJsonPath('message', fn (string $message): bool => str_contains($message, 'SITEKIT_CLIENT_REPO'));
    }

    public function test_failed_dispatch_marks_update_failed(): void
    {
        Http::fake([
            'api.github.com/repos/oxtech/sitekit/releases*' => Http::response($this->releases()),
            'api.github.com/repos/client/noauf-site/*' => Http::response(['message' => 'Bad credentials'], 401),
        ]);

        $this->actingAs($this->admin, 'employee')
            ->postJson(route('api.v1.system.updates.install'), ['version' => '1.2.0'])
            ->assertStatus(502);

        $this->assertDatabaseHas('update_history', ['to_version' => '1.2.0', 'status' => 'failed']);
    }

    public function test_signed_callback_records_progress_and_completion(): void
    {
        $update = UpdateHistory::create(['from_version' => '1.0.0', 'to_version' => '1.2.0', 'status' => 'queued', 'source' => 'github', 'started_at' => now()]);

        $this->signedPost('api.v1.system.updates.callback', [
            'update_id' => $update->id,
            'status' => 'running',
            'step' => 'deploy',
            'message' => 'Deploying to VPS',
            'run_url' => 'https://github.com/client/noauf-site/actions/runs/1',
        ])->assertOk();

        $update->refresh();
        $this->assertSame('running', $update->status);
        $this->assertSame('deploy', $update->step);
        $this->assertSame('https://github.com/client/noauf-site/actions/runs/1', $update->run_url);

        $this->signedPost('api.v1.system.updates.callback', [
            'update_id' => $update->id,
            'status' => 'success',
            'step' => 'done',
            'message' => 'Deployed v1.2.0',
        ])->assertOk();

        $update->refresh();
        $this->assertSame('success', $update->status);
        $this->assertNotNull($update->finished_at);
        $this->assertCount(2, $update->log);

        // Finished runs cannot be changed by replayed callbacks.
        $this->signedPost('api.v1.system.updates.callback', [
            'update_id' => $update->id,
            'status' => 'failed',
        ])->assertStatus(409);
    }

    public function test_callback_with_invalid_signature_is_rejected(): void
    {
        $update = UpdateHistory::create(['to_version' => '1.2.0', 'status' => 'queued', 'source' => 'github']);

        $this->postJson(route('api.v1.system.updates.callback'), ['update_id' => $update->id, 'status' => 'success'], [
            'X-Sitekit-Signature' => 'sha256=invalid',
        ])->assertUnauthorized();

        $this->assertSame('queued', $update->fresh()->status);
    }

    public function test_signed_notify_refreshes_the_cached_status(): void
    {
        $this->fakeReleases();

        $this->signedPost('api.v1.system.updates.notify', ['version' => 'v1.2.0'])
            ->assertOk()
            ->assertJsonPath('data.has_update', true)
            ->assertJsonPath('data.latest_version', '1.2.0');
    }

    public function test_notify_without_signature_is_rejected(): void
    {
        $this->postJson(route('api.v1.system.updates.notify'))->assertUnauthorized();
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function signedPost(string $routeName, array $payload): TestResponse
    {
        $body = json_encode($payload, JSON_THROW_ON_ERROR);

        return $this->call('POST', route($routeName), [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_X_SITEKIT_SIGNATURE' => 'sha256='.hash_hmac('sha256', $body, self::SECRET),
        ], $body);
    }

    private function fakeReleases(): void
    {
        Http::fake([
            'api.github.com/repos/oxtech/sitekit/releases*' => Http::response($this->releases()),
            'api.github.com/repos/client/noauf-site/actions/workflows/*/dispatches' => Http::response(null, 204),
        ]);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function releases(): array
    {
        return [
            ['tag_name' => 'v1.3.0-beta.1', 'name' => 'Beta', 'body' => 'Beta notes', 'draft' => false, 'prerelease' => true, 'html_url' => 'https://github.com/oxtech/sitekit/releases/tag/v1.3.0-beta.1', 'published_at' => '2026-11-20T10:00:00Z'],
            ['tag_name' => 'v1.4.0', 'name' => 'Draft', 'body' => 'Draft', 'draft' => true, 'prerelease' => false],
            ['tag_name' => 'v1.2.0', 'name' => 'Sitekit 1.2.0', 'body' => 'Faster dashboard', 'draft' => false, 'prerelease' => false, 'html_url' => 'https://github.com/oxtech/sitekit/releases/tag/v1.2.0', 'published_at' => '2026-11-18T10:00:00Z'],
            ['tag_name' => 'v1.1.0', 'name' => 'Sitekit 1.1.0', 'body' => 'Older', 'draft' => false, 'prerelease' => false],
        ];
    }
}
