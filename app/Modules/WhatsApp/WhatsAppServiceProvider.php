<?php

declare(strict_types=1);

namespace App\Modules\WhatsApp;

use App\Contracts\WhatsAppGateway;
use App\Modules\WhatsApp\Models\WhatsAppConversation;
use App\Modules\WhatsApp\Models\WhatsAppMessage;
use App\Modules\WhatsApp\Reports\WhatsAppReportSection;
use App\Modules\WhatsApp\Services\WhatsAppManager;
use App\Modules\WhatsApp\Services\WhatsAppSettings;
use App\Services\Reports\ReportRegistry;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\ServiceProvider;

/**
 * WhatsApp module: binds the core WhatsAppGateway to the showroom's provider (Meta / Twilio).
 */
class WhatsAppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/config/whatsapp.php', 'whatsapp');
        $this->app->singleton(WhatsAppSettings::class);
        $this->app->singleton(WhatsAppManager::class);
        $this->app->bind(WhatsAppGateway::class, WhatsAppManager::class);
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/database/migrations');
        $this->loadRoutesFrom(__DIR__.'/routes/api.php');

        // Stable names for what a lead note was written on (stored in lead_notes.notable_type).
        Relation::morphMap([
            WhatsAppConversation::MORPH_ALIAS => WhatsAppConversation::class,
            WhatsAppMessage::MORPH_ALIAS => WhatsAppMessage::class,
        ]);

        $this->callAfterResolving(ReportRegistry::class, fn (ReportRegistry $reports) => $reports->register(WhatsAppReportSection::class));
    }
}
