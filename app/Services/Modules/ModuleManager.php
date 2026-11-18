<?php

declare(strict_types=1);

namespace App\Services\Modules;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\File;

class ModuleManager
{
    private string $modulesPath;

    public function __construct(?string $modulesPath = null)
    {
        $this->modulesPath = $modulesPath ?: app_path('Modules');
    }

    /**
     * Discover all modules located in app/Modules.
     *
     * @return Collection<string, array<string, mixed>>
     */
    public function all(): Collection
    {
        if (! File::isDirectory($this->modulesPath)) {
            return collect();
        }

        $modules = collect();

        foreach (File::directories($this->modulesPath) as $directory) {
            $manifestPath = $directory.DIRECTORY_SEPARATOR.'module.json';

            if (File::exists($manifestPath)) {
                $content = File::get($manifestPath);
                $manifest = json_decode($content, true);

                if (is_array($manifest) && isset($manifest['key'])) {
                    $manifest['path'] = $directory;
                    $manifest['enabled'] = (bool) ($manifest['enabled'] ?? true);
                    $modules->put($manifest['key'], $manifest);
                }
            }
        }

        return $modules;
    }

    /**
     * @return Collection<string, array<string, mixed>>
     */
    public function enabled(): Collection
    {
        return $this->all()->filter(fn (array $m) => (bool) ($m['enabled'] ?? false));
    }

    /**
     * @return array<string, mixed>|null
     */
    public function find(string $key): ?array
    {
        return $this->all()->get($key);
    }

    public function enable(string $key): bool
    {
        return $this->setEnabledState($key, true);
    }

    public function disable(string $key): bool
    {
        return $this->setEnabledState($key, false);
    }

    private function setEnabledState(string $key, bool $enabled): bool
    {
        $module = $this->find($key);
        if (! $module || ! isset($module['path'])) {
            return false;
        }

        $manifestPath = $module['path'].DIRECTORY_SEPARATOR.'module.json';
        $module['enabled'] = $enabled;
        unset($module['path']);

        File::put($manifestPath, json_encode($module, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        return true;
    }
}
