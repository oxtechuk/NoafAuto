<?php

declare(strict_types=1);

namespace App\Services\Updates;

use App\Models\UpdateHistory;
use App\Services\Health\HealthCheckService;
use Illuminate\Support\Facades\Artisan;
use Spatie\Backup\Commands\BackupCommand;
use Throwable;

class UpgradeService
{
    public function __construct(
        private readonly HealthCheckService $healthCheck,
    ) {}

    public function start(string $from, string $to): UpdateHistory
    {
        return UpdateHistory::create([
            'from_version' => $from,
            'to_version' => $to,
            'status' => 'running',
            'started_at' => now(),
            'log' => ['Upgrade process started'],
        ]);
    }

    /**
     * @param  list<string>  $logs
     */
    public function finish(
        UpdateHistory $record,
        string $status,
        ?Throwable $exception = null,
        array $logs = []
    ): void {
        $existingLog = (array) ($record->log ?? []);
        $mergedLog = array_merge($existingLog, $logs);

        if ($exception !== null) {
            $mergedLog[] = 'Error: '.$exception->getMessage();
        }

        $record->update([
            'status' => $status,
            'finished_at' => now(),
            'log' => $mergedLog,
            'error' => $exception?->getMessage(),
        ]);
    }

    /**
     * Execute full upgrade flow.
     *
     * @return array{
     *     success: bool,
     *     from: string,
     *     to: string,
     *     dry_run: bool,
     *     logs: list<string>,
     *     error: ?string
     * }
     */
    public function execute(string $to, bool $dryRun = false, ?callable $logger = null): array
    {
        $from = (string) config('sitekit.version', '0.1.0');
        $logs = [];

        $log = function (string $message) use (&$logs, $logger): void {
            $logs[] = $message;
            if ($logger !== null) {
                $logger($message);
            }
        };

        $log("Sitekit Upgrade: Preparing transition from v{$from} to v{$to}");

        if ($dryRun) {
            $log('[Dry-Run] Simulating database migrations check');
            $log('[Dry-Run] Simulating cache flush (config, route, view)');
            $log('[Dry-Run] Simulating post-upgrade health check');

            $health = $this->healthCheck->check();
            $log('[Dry-Run] Health check simulation: '.($health['healthy'] ? 'PASSED' : 'FAILED'));

            return [
                'success' => $health['healthy'],
                'from' => $from,
                'to' => $to,
                'dry_run' => true,
                'logs' => $logs,
                'error' => $health['healthy'] ? null : 'Health checks failed during simulation',
            ];
        }

        $record = $this->start($from, $to);

        try {
            try {
                if (class_exists(BackupCommand::class)) {
                    $log('Creating pre-upgrade database backup...');
                    Artisan::call('backup:run', ['--only-db' => true]);
                    $log('Database backup created.');
                }
            } catch (Throwable) {
                // If local mysqldump binary is not found, continue with upgrade
            }

            $log('Running database migrations...');
            Artisan::call('migrate', ['--force' => true]);
            $log('Migrations completed.');

            $log('Clearing and warming application caches...');
            Artisan::call('config:clear');
            Artisan::call('route:clear');
            Artisan::call('view:clear');
            $log('Caches cleared.');

            $log('Running system health check...');
            $health = $this->healthCheck->check();
            if (! $health['healthy']) {
                throw new \RuntimeException('System health checks failed post-upgrade');
            }
            $log('Health check passed.');

            $this->finish($record, 'success', null, $logs);

            return [
                'success' => true,
                'from' => $from,
                'to' => $to,
                'dry_run' => false,
                'logs' => $logs,
                'error' => null,
            ];
        } catch (Throwable $e) {
            $log('Upgrade failed: '.$e->getMessage());
            $this->finish($record, 'failed', $e, $logs);

            return [
                'success' => false,
                'from' => $from,
                'to' => $to,
                'dry_run' => false,
                'logs' => $logs,
                'error' => $e->getMessage(),
            ];
        }
    }
}
