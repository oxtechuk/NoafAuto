<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\Updates\UpgradeService;
use Illuminate\Console\Command;

class SitekitUpgradeCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sitekit:upgrade
                            {--dry-run : Simulate upgrade steps without modifying database or clearing cache}
                            {--to=1.0.0 : Target version for upgrade}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Execute post-deployment update steps (migrations, cache, health checks, audit log)';

    /**
     * Execute the console command.
     */
    public function handle(UpgradeService $upgradeService): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $toVersion = (string) ($this->option('to') ?: '1.0.0');

        $this->info($dryRun ? 'Starting Sitekit upgrade simulation (DRY RUN)...' : 'Starting Sitekit upgrade execution...');

        $result = $upgradeService->execute(
            $toVersion,
            $dryRun,
            fn (string $msg) => $this->line("  > {$msg}")
        );

        if (! $result['success']) {
            $this->error("\nUpgrade failed: ".($result['error'] ?? 'Unknown error'));

            return self::FAILURE;
        }

        $this->info("\nSitekit upgrade completed successfully!");

        return self::SUCCESS;
    }
}
