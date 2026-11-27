<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Api\Contracts\ApiResponse;
use App\Http\Controllers\Api\ApiBaseController;
use App\Models\Employee;
use App\Models\UpdateHistory;
use App\Services\Updates\GitHubUpdateDispatcher;
use App\Services\Updates\UpdateCheckerService;
use App\Services\Updates\WebhookSignature;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Throwable;

/**
 * System updates for the admin dashboard.
 *
 * Flow: the base repo publishes a GitHub release → this instance detects it →
 * the owner clicks "install" → we dispatch the client repo's GitHub Action →
 * the Action merges, tests, deploys and calls back with progress.
 */
class SystemUpdateController extends ApiBaseController
{
    /** An update that has not reported back within this window is considered dead. */
    private const STALE_AFTER_MINUTES = 120;

    public function index(Request $request, UpdateCheckerService $checker, GitHubUpdateDispatcher $dispatcher): ApiResponse
    {
        $this->authorizeAdmin($request);

        return $this->respondSuccess($this->payload($checker->cachedStatus(), $dispatcher), 'Update status retrieved');
    }

    public function check(Request $request, UpdateCheckerService $checker, GitHubUpdateDispatcher $dispatcher): ApiResponse
    {
        $this->authorizeAdmin($request);

        return $this->respondSuccess($this->payload($checker->refresh(), $dispatcher), 'Update check completed');
    }

    public function install(Request $request, UpdateCheckerService $checker, GitHubUpdateDispatcher $dispatcher): ApiResponse
    {
        $employee = $this->authorizeAdmin($request);

        $validated = $request->validate([
            'version' => ['required', 'string', 'max:50'],
        ]);

        if (! $dispatcher->isConfigured()) {
            return $this->respondError(
                'Automatic updates are not configured. Missing: '.implode(', ', $dispatcher->missingConfiguration()),
                503,
            );
        }

        if ($this->activeRun() !== null) {
            return $this->respondError('Another update is already in progress', 409);
        }

        $status = $checker->cachedStatus();
        $version = $checker->normalizeVersion($validated['version']);

        if (! $status['has_update'] || $version !== $status['latest_version']) {
            return $this->respondError("Version [{$version}] is not an available update", 422);
        }

        $update = UpdateHistory::create([
            'from_version' => $status['current_version'],
            'to_version' => $version,
            'status' => 'queued',
            'source' => 'github',
            'step' => 'dispatch',
            'triggered_by' => $employee->id,
            'started_at' => now(),
            'log' => [],
        ]);

        try {
            $dispatcher->dispatch($update, $version);
        } catch (Throwable $e) {
            $update->appendLog('Dispatch failed: '.$e->getMessage());
            $update->fill(['status' => 'failed', 'error' => $e->getMessage(), 'finished_at' => now()])->save();

            return $this->respondError('Could not start the update workflow: '.$e->getMessage(), 502);
        }

        $update->appendLog("GitHub Action dispatched for v{$version} by {$employee->name}");
        $update->save();

        return $this->respond($this->serializeRun($update), 'Update started', 202);
    }

    /**
     * Progress callback from the client repo's GitHub Action (HMAC signed).
     */
    public function callback(Request $request, WebhookSignature $signature, UpdateCheckerService $checker): ApiResponse
    {
        if (! $signature->isValid($request->getContent(), $request->header(WebhookSignature::HEADER))) {
            return $this->respondError('Invalid signature', 401);
        }

        $validated = $request->validate([
            'update_id' => ['required', 'integer', 'exists:update_history,id'],
            'status' => ['required', Rule::in(['running', ...UpdateHistory::FINAL_STATUSES])],
            'step' => ['nullable', 'string', 'max:50'],
            'message' => ['nullable', 'string', 'max:2000'],
            'run_url' => ['nullable', 'url', 'max:255'],
        ]);

        $update = UpdateHistory::findOrFail($validated['update_id']);

        if (in_array($update->status, UpdateHistory::FINAL_STATUSES, true)) {
            return $this->respondError('This update has already finished', 409);
        }

        $isFinal = in_array($validated['status'], UpdateHistory::FINAL_STATUSES, true);

        $update->fill([
            'status' => $validated['status'],
            'step' => $validated['step'] ?? $update->step,
            'run_url' => $validated['run_url'] ?? $update->run_url,
        ]);
        $update->appendLog(trim(($validated['step'] ?? $validated['status']).': '.($validated['message'] ?? '')));

        if ($isFinal) {
            $update->finished_at = now();
            $update->error = $validated['status'] === 'failed' ? ($validated['message'] ?? 'Update failed') : null;
        }

        $update->save();

        if ($validated['status'] === 'success') {
            $checker->forget();
        }

        return $this->respondSuccess($this->serializeRun($update), 'Update progress recorded');
    }

    /**
     * Release notification from the base repo's release workflow (HMAC signed).
     * Only refreshes the update check — it never installs anything.
     */
    public function notify(Request $request, WebhookSignature $signature, UpdateCheckerService $checker): ApiResponse
    {
        if (! $signature->isValid($request->getContent(), $request->header(WebhookSignature::HEADER))) {
            return $this->respondError('Invalid signature', 401);
        }

        $status = $checker->refresh();

        return $this->respondSuccess([
            'current_version' => $status['current_version'],
            'latest_version' => $status['latest_version'],
            'has_update' => $status['has_update'],
        ], 'Update check refreshed');
    }

    /**
     * @param  array<string, mixed>  $status
     * @return array<string, mixed>
     */
    private function payload(array $status, GitHubUpdateDispatcher $dispatcher): array
    {
        $activeRun = $this->activeRun($dispatcher);

        return [
            ...$status,
            'source' => 'system',
            'release_url' => null,
            'can_install' => $status['has_update'] && $dispatcher->isConfigured() && $activeRun === null,
            'configuration' => [
                'auto_update_ready' => $dispatcher->isConfigured(),
                'missing' => $dispatcher->missingConfiguration(),
                'upstream_repo' => null,
                'client_repo' => null,
            ],
            'active_run' => $activeRun ? $this->serializeRun($activeRun) : null,
            'history' => UpdateHistory::query()
                ->with('triggeredBy:id,name')
                ->latest('id')
                ->limit(10)
                ->get()
                ->map(fn (UpdateHistory $run): array => $this->serializeRun($run))
                ->all(),
        ];
    }

    /**
     * The currently running update, if any. Runs that stopped reporting are marked failed.
     */
    private function activeRun(?GitHubUpdateDispatcher $dispatcher = null): ?UpdateHistory
    {
        $run = UpdateHistory::query()->whereIn('status', UpdateHistory::ACTIVE_STATUSES)->latest('id')->first();

        if ($run === null) {
            return null;
        }

        if ($dispatcher !== null) {
            $dispatcher->syncStatus($run);
            if (! in_array($run->status, UpdateHistory::ACTIVE_STATUSES, true)) {
                return null;
            }
        }

        if ($run->updated_at?->lt(now()->subMinutes(self::STALE_AFTER_MINUTES))) {
            $run->appendLog('No progress reported for '.self::STALE_AFTER_MINUTES.' minutes — marked as failed');
            $run->fill(['status' => 'failed', 'error' => 'Timed out waiting for the GitHub Action', 'finished_at' => now()])->save();

            return null;
        }

        return $run;
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeRun(UpdateHistory $run): array
    {
        $sanitizedLog = collect((array) ($run->log ?? []))
            ->map(function ($line): string {
                $line = (string) preg_replace('/https?:\/\/[^\s]+/i', '', (string) $line);
                $line = str_ireplace(['GitHub Action', 'GitHub Actions', 'GitHub'], 'نظام التحديث الآلي', $line);

                return trim($line);
            })
            ->filter(fn (string $line): bool => $line !== '')
            ->values()
            ->all();

        return [
            'id' => $run->id,
            'from_version' => $run->from_version,
            'to_version' => $run->to_version,
            'status' => $run->status,
            'source' => 'system',
            'step' => $run->step,
            'run_url' => null,
            'triggered_by' => $run->relationLoaded('triggeredBy') ? $run->triggeredBy?->name : null,
            'started_at' => $run->started_at?->toIso8601String(),
            'finished_at' => $run->finished_at?->toIso8601String(),
            'error' => $run->error ? (string) preg_replace('/https?:\/\/[^\s]+/i', '', (string) $run->error) : null,
            'log' => $sanitizedLog,
        ];
    }

    private function authorizeAdmin(Request $request): Employee
    {
        /** @var Employee|null $employee */
        $employee = $request->user('employee');

        if (! $employee || ! $employee->isAdmin()) {
            abort(403, 'Unauthorized. Admin access required.');
        }

        return $employee;
    }
}
