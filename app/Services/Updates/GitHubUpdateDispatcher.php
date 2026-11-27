<?php

declare(strict_types=1);

namespace App\Services\Updates;

use App\Models\UpdateHistory;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Starts the "sitekit-update" GitHub Action in the client's own repository.
 *
 * That workflow merges the upstream release tag into the client repo, runs the
 * test suite, deploys to the VPS and reports progress back to this instance.
 */
class GitHubUpdateDispatcher
{
    public function isConfigured(): bool
    {
        return $this->missingConfiguration() === [];
    }

    /**
     * @return list<string>
     */
    public function missingConfiguration(): array
    {
        $required = [
            'SITEKIT_UPSTREAM_REPO' => config('sitekit.github.upstream_repo'),
            'SITEKIT_CLIENT_REPO' => config('sitekit.github.client_repo'),
            'SITEKIT_GITHUB_TOKEN' => config('sitekit.github.token'),
            'SITEKIT_DEPLOY_SECRET' => config('sitekit.deploy_secret'),
        ];

        return array_keys(array_filter($required, fn (mixed $value): bool => trim((string) $value) === ''));
    }

    /**
     * @throws RuntimeException when GitHub rejects the dispatch
     */
    public function dispatch(UpdateHistory $update, string $version): void
    {
        $repo = (string) config('sitekit.github.client_repo');
        $workflow = (string) config('sitekit.github.update_workflow', 'sitekit-update.yml');

        $response = Http::baseUrl((string) config('sitekit.github.api_url', 'https://api.github.com'))
            ->acceptJson()
            ->withHeaders(['X-GitHub-Api-Version' => '2022-11-28'])
            ->withToken((string) config('sitekit.github.token'))
            ->timeout(15)
            ->post("/repos/{$repo}/actions/workflows/{$workflow}/dispatches", [
                'ref' => (string) config('sitekit.github.client_branch', 'main'),
                'inputs' => [
                    'version' => 'v'.ltrim($version, 'vV'),
                    'update_id' => (string) $update->id,
                    'callback_url' => route('api.v1.system.updates.callback'),
                ],
            ]);

        if (! $response->successful()) {
            $message = (string) ($response->json('message') ?? $response->body());

            throw new RuntimeException("GitHub workflow dispatch failed (HTTP {$response->status()}): {$message}");
        }
    }

    /**
     * Poll the latest GitHub Actions workflow run to sync status when webhooks cannot reach this instance.
     */
    public function syncStatus(UpdateHistory $update): void
    {
        if (! $this->isConfigured()) {
            return;
        }

        $repo = (string) config('sitekit.github.client_repo');
        $workflow = (string) config('sitekit.github.update_workflow', 'sitekit-update.yml');

        try {
            $response = Http::baseUrl((string) config('sitekit.github.api_url', 'https://api.github.com'))
                ->acceptJson()
                ->withHeaders(['X-GitHub-Api-Version' => '2022-11-28'])
                ->withToken((string) config('sitekit.github.token'))
                ->timeout(10)
                ->get("/repos/{$repo}/actions/workflows/{$workflow}/runs", [
                    'per_page' => 1,
                ]);

            if (! $response->successful()) {
                return;
            }

            $run = $response->json('workflow_runs.0');
            if (! is_array($run)) {
                return;
            }

            $status = (string) ($run['status'] ?? '');
            $conclusion = (string) ($run['conclusion'] ?? '');
            $htmlUrl = (string) ($run['html_url'] ?? '');

            if ($htmlUrl !== '') {
                $update->run_url = $htmlUrl;
            }

            if ($status === 'completed') {
                if ($conclusion === 'success') {
                    $update->status = 'success';
                    $update->finished_at = now();
                    $update->appendLog("Updated successfully via GitHub Action: {$htmlUrl}");
                    $update->save();
                    app(UpdateCheckerService::class)->forget();
                } else {
                    $update->status = 'failed';
                    $update->finished_at = now();
                    $update->error = "Workflow finished with conclusion: {$conclusion}";
                    $update->appendLog("Workflow failed on GitHub Actions ({$conclusion}): {$htmlUrl}");
                    $update->save();
                }
            } elseif ($status === 'in_progress' && $update->status === 'queued') {
                $update->status = 'running';
                $update->step = 'running';
                $update->appendLog("GitHub Action running: {$htmlUrl}");
                $update->save();
            }
        } catch (\Throwable) {
            // Ignore API polling errors; fallback to normal flow
        }
    }
}
