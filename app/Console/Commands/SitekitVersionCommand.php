<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;

class SitekitVersionCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sitekit:version';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Display Sitekit core version, update channel, and runtime environment';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $version = (string) config('sitekit.version', '0.1.0');
        $channel = (string) config('sitekit.update_channel', 'stable');

        $this->info('Sitekit Core Information');
        $this->table(
            ['Property', 'Value'],
            [
                ['Sitekit Version', $version],
                ['Update Channel', $channel],
                ['Laravel Version', app()->version()],
                ['PHP Version', PHP_VERSION],
                ['Environment', app()->environment()],
            ]
        );

        return self::SUCCESS;
    }
}
