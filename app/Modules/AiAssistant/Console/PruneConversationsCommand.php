<?php

declare(strict_types=1);

namespace App\Modules\AiAssistant\Console;

use App\Modules\AiAssistant\Models\AssistantConversation;
use App\Modules\AiAssistant\Services\AssistantSettings;
use Illuminate\Console\Command;

class PruneConversationsCommand extends Command
{
    /**
     * @var string
     */
    protected $signature = 'ai-assistant:prune';

    /**
     * @var string
     */
    protected $description = 'Delete AI assistant conversations older than the retention period set in the assistant settings';

    public function handle(AssistantSettings $settings): int
    {
        $days = max(1, (int) $settings->get('retention_days', 90));

        $deleted = AssistantConversation::query()
            ->where(fn ($q) => $q->where('last_activity_at', '<', now()->subDays($days))
                ->orWhere(fn ($q) => $q->whereNull('last_activity_at')->where('created_at', '<', now()->subDays($days))))
            ->delete();

        $this->info("Deleted {$deleted} conversation(s) older than {$days} days.");

        return self::SUCCESS;
    }
}
