<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\Updates\UpdateCheckerService;
use Illuminate\Console\Command;

class SitekitUpdatesCheckCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sitekit:updates:check';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check for available Sitekit core upgrades against the update manifest';

    /**
     * Execute the console command.
     */
    public function handle(UpdateCheckerService $checker): int
    {
        $this->info('Checking for Sitekit updates...');
        $result = $checker->checkForUpdates();

        if ($result['error'] !== null) {
            $this->error("Failed to check for updates: {$result['error']}");

            return self::FAILURE;
        }

        $this->table(
            ['Current Version', 'Latest Version', 'Channel', 'Update Available'],
            [
                [
                    $result['current_version'],
                    $result['latest_version'],
                    $result['channel'],
                    $result['has_update'] ? 'YES' : 'NO',
                ],
            ]
        );

        if ($result['has_update']) {
            $this->warn("A new version ({$result['latest_version']}) is available!");
            if ($result['changelog']) {
                $this->line("\nChangelog:\n".$result['changelog']);
            }
            $this->line("\nRun `php artisan sitekit:upgrade --dry-run` to simulate upgrade.");
        } else {
            $this->info('Your Sitekit installation is up to date.');
        }

        return self::SUCCESS;
    }
}
