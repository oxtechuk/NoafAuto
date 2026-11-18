<?php

declare(strict_types=1);

namespace App\Providers;

use App\Services\Modules\ModuleManager;
use Illuminate\Support\ServiceProvider;

class SitekitModuleServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(ModuleManager::class, function () {
            return new ModuleManager;
        });

        $moduleManager = $this->app->make(ModuleManager::class);

        foreach ($moduleManager->enabled() as $module) {
            $providerClass = $module['provider'] ?? null;
            if ($providerClass && class_exists($providerClass)) {
                $this->app->register($providerClass);
            }
        }
    }

    public function boot(): void
    {
        //
    }
}
