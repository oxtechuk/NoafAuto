<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\Health\HealthCheckService;
use Illuminate\Console\Command;

class SitekitHealthCheckCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sitekit:health-check';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Perform comprehensive system health checks (PHP, Database, Storage, Cache)';

    /**
     * Execute the console command.
     */
    public function handle(HealthCheckService $healthService): int
    {
        $this->info('Running Sitekit system health checks...');
        $result = $healthService->check();

        $rows = [];
        foreach ($result['checks'] as $checkName => $details) {
            $rows[] = [
                ucwords(str_replace('_', ' ', $checkName)),
                strtoupper($details['status']),
                $details['message'],
            ];
        }

        $this->table(['Component', 'Status', 'Message'], $rows);

        if (! $result['healthy']) {
            $this->error('One or more health checks failed!');

            return self::FAILURE;
        }

        $this->info('All system components are healthy and operational.');

        return self::SUCCESS;
    }
}
