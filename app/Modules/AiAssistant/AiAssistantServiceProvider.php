<?php

declare(strict_types=1);

namespace App\Modules\AiAssistant;

use App\Modules\AiAssistant\Console\PruneConversationsCommand;
use App\Modules\AiAssistant\Contracts\LlmProvider;
use App\Modules\AiAssistant\Providers\GeminiProvider;
use App\Modules\AiAssistant\Reports\AiAssistantReportSection;
use App\Modules\AiAssistant\Services\AssistantSettings;
use App\Services\Reports\ReportRegistry;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\ServiceProvider;

/**
 * AI Assistant module (registered by SitekitModuleServiceProvider when enabled in module.json).
 */
class AiAssistantServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(AssistantSettings::class);

        // Only Gemini for now; the driver is chosen from the settings once more providers exist.
        $this->app->bind(LlmProvider::class, fn ($app) => new GeminiProvider($app->make(AssistantSettings::class)));
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/database/migrations');
        $this->loadRoutesFrom(__DIR__.'/routes/api.php');

        if ($this->app->runningInConsole()) {
            $this->commands([PruneConversationsCommand::class]);
        }

        $this->callAfterResolving(ReportRegistry::class, fn (ReportRegistry $reports) => $reports->register(AiAssistantReportSection::class));

        $this->callAfterResolving(Schedule::class, function (Schedule $schedule): void {
            $schedule->command('ai-assistant:prune')->dailyAt('04:00')->withoutOverlapping();
        });
    }
}
