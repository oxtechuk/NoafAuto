<?php

declare(strict_types=1);

namespace App\Modules\WhatsApp;

use App\Contracts\WhatsAppGateway;
use App\Modules\WhatsApp\Services\WhatsAppManager;
use App\Modules\WhatsApp\Services\WhatsAppSettings;
use Illuminate\Support\ServiceProvider;

/**
 * WhatsApp module: binds the core WhatsAppGateway to the showroom's provider (Meta / Twilio).
 */
class WhatsAppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(WhatsAppSettings::class);
        $this->app->singleton(WhatsAppManager::class);
        $this->app->bind(WhatsAppGateway::class, WhatsAppManager::class);
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/database/migrations');
        $this->loadRoutesFrom(__DIR__.'/routes/api.php');
    }
}
