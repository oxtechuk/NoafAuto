<?php

declare(strict_types=1);

namespace App\Modules\AiAssistant\Tools;

use App\Modules\AiAssistant\Models\AssistantConversation;
use App\Modules\AiAssistant\Services\AssistantSettings;

final class ToolContext
{
    public function __construct(
        public readonly AssistantConversation $conversation,
        public readonly AssistantSettings $settings,
    ) {}

    public function showPrices(): bool
    {
        return (bool) $this->settings->get('show_prices', true);
    }

    public function maxResults(): int
    {
        return max(1, min(8, (int) $this->settings->get('max_results', 4)));
    }
}
