<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Symfony\Component\Finder\SplFileInfo;
use Symfony\Component\Process\Process;

class SitekitStorefrontBuildCommand extends Command
{
    /**
     * @var string
     */
    protected $signature = 'sitekit:storefront:build
        {--path= : Storefront source folder (default: config sitekit.storefront.path)}
        {--fresh : Always reinstall dependencies with "npm ci"}
        {--skip-install : Never install dependencies}';

    /**
     * @var string
     */
    protected $description = 'Build the project storefront (its own package.json) and publish dist/ to public/storefront';

    public function handle(): int
    {
        $sourcePath = $this->absolutePath((string) ($this->option('path') ?: config('sitekit.storefront.path')));
        $publicPath = rtrim((string) config('sitekit.storefront.public_path'), '\\/');

        if (! is_file($sourcePath.DIRECTORY_SEPARATOR.'package.json')) {
            $this->error("No package.json found in [{$sourcePath}].");
            $this->line('Set SITEKIT_STOREFRONT_PATH in .env (e.g. resources/noauf) or pass --path=.');

            return self::FAILURE;
        }

        $needsInstall = $this->option('fresh') || ! is_dir($sourcePath.DIRECTORY_SEPARATOR.'node_modules');
        if ($needsInstall && ! $this->option('skip-install') && ! $this->runStep('npm ci --no-audit --no-fund', $sourcePath)) {
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

        [$copied, $removed] = $this->publish($distPath, $publicPath);

        $this->info("Storefront published to [{$publicPath}] ({$copied} files updated, {$removed} removed).");
        if (! config('sitekit.storefront.enabled')) {
            $this->warn('Set SITEKIT_STOREFRONT_ENABLED=true in .env to serve it instead of the bundled store.');
        }

        return self::SUCCESS;
    }

    /**
     * Sync dist/ into public/storefront: copy only changed files and remove stale ones.
     *
     * Avoids deleting the whole folder, which fails on Windows while a dev server
     * holds files open, and keeps unchanged hashed assets cached by browsers.
     *
     * @return array{0: int, 1: int}
     */
    private function publish(string $distPath, string $publicPath): array
    {
        File::ensureDirectoryExists($publicPath);

        $copied = 0;
        $expected = [];

        /** @var SplFileInfo $file */
        foreach (File::allFiles($distPath) as $file) {
            $relative = $file->getRelativePathname();
            $expected[str_replace('\\', '/', $relative)] = true;
            $target = $publicPath.DIRECTORY_SEPARATOR.$relative;

            if (is_file($target) && filesize($target) === $file->getSize() && md5_file($target) === md5_file($file->getPathname())) {
                continue;
            }

            File::ensureDirectoryExists(dirname($target));
            File::copy($file->getPathname(), $target);
            $copied++;
        }

        $removed = 0;
        /** @var SplFileInfo $file */
        foreach (File::allFiles($publicPath) as $file) {
            if (! isset($expected[str_replace('\\', '/', $file->getRelativePathname())]) && @unlink($file->getPathname())) {
                $removed++;
            }
        }

        return [$copied, $removed];
    }

    private function absolutePath(string $path): string
    {
        $path = rtrim($path, '\\/');

        return preg_match('#^([a-zA-Z]:)?[\\\\/]#', $path) ? $path : base_path($path);
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
