<?php

namespace App\Providers;

use App\Services\Infrastructure\InfrastructureConfigurator;
use App\Services\Infrastructure\InfrastructureSettings;
use Illuminate\Support\ServiceProvider;

class InfrastructureServiceProvider extends ServiceProvider
{
    /**
     * Applied in register() (not boot) so the cache, session and queue managers, which resolve lazily,
     * already see the switched drivers the first time anything touches them.
     */
    public function register(): void
    {
        $this->app->singleton(InfrastructureSettings::class, fn () => new InfrastructureSettings(
            storage_path('app/private/sitekit/infrastructure.json'),
        ));

        $this->app->singleton(InfrastructureConfigurator::class, fn ($app) => new InfrastructureConfigurator(
            $app->make(InfrastructureSettings::class),
            $app->make('config'),
            storage_path('framework/redis-unreachable'),
        ));

        // Tests run on their own drivers (phpunit.xml); a local admin setting must never change them.
        if (! $this->app->runningUnitTests()) {
            $this->app->make(InfrastructureConfigurator::class)->apply();
        }
    }
}
