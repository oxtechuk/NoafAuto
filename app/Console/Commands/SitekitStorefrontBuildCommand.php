<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Symfony\Component\Process\Process;

class SitekitStorefrontBuildCommand extends Command
{
    /**
     * @var string
     */
    protected $signature = 'sitekit:storefront:build
        {--path= : Storefront source folder (default: config sitekit.storefront.path)}
        {--skip-install : Do not run "npm ci" before building}';

    /**
     * @var string
     */
    protected $description = 'Build the project storefront (its own package.json) and publish dist/ to public/storefront';

    public function handle(): int
    {
        $sourcePath = rtrim((string) ($this->option('path') ?: config('sitekit.storefront.path')), '\\/');
        $publicPath = rtrim((string) config('sitekit.storefront.public_path'), '\\/');

        if (! is_file($sourcePath.DIRECTORY_SEPARATOR.'package.json')) {
            $this->error("No package.json found in [{$sourcePath}].");

            return self::FAILURE;
        }

        if (! $this->option('skip-install') && ! $this->runStep('npm ci --no-audit --no-fund', $sourcePath)) {
            return self::FAILURE;
        }

        if (! $this->runStep((string) config('sitekit.storefront.build_command', 'npm run build'), $sourcePath)) {
            return self::FAILURE;
        }

        $distPath = $sourcePath.DIRECTORY_SEPARATOR.'dist';
        if (! is_file($distPath.DIRECTORY_SEPARATOR.'index.html')) {
            $this->error("Build finished but [{$distPath}/index.html] was not found.");

            return self::FAILURE;
        }

        File::deleteDirectory($publicPath);
        File::copyDirectory($distPath, $publicPath);

        $this->info("Storefront published to [{$publicPath}].");
        if (! config('sitekit.storefront.enabled')) {
            $this->warn('Set SITEKIT_STOREFRONT_ENABLED=true in .env to serve it instead of the bundled store.');
        }

        return self::SUCCESS;
    }

    private function runStep(string $command, string $workingDirectory): bool
    {
        $this->line("<comment>→</comment> {$command}");

        $process = Process::fromShellCommandline($command, $workingDirectory, null, null, 900);
        $process->run(fn (string $type, string $buffer) => $this->output->write($buffer));

        if (! $process->isSuccessful()) {
            $this->error("Command failed: {$command}");

            return false;
        }

        return true;
    }
}
