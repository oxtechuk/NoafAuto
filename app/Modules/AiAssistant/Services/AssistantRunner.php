<?php

declare(strict_types=1);

namespace App\Modules\AiAssistant\Services;

use App\Modules\AiAssistant\Contracts\LlmProvider;
use App\Modules\AiAssistant\Models\AssistantConversation;
use App\Modules\AiAssistant\Models\AssistantMessage;
use App\Modules\AiAssistant\Support\AssistantException;
use App\Modules\AiAssistant\Tools\ToolContext;
use App\Modules\AiAssistant\Tools\ToolRegistry;
use App\Modules\AiAssistant\Tools\ToolResult;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * One customer turn: user message → model ↔ tools (bounded rounds) → final reply + cards.
 */
class AssistantRunner
{
    public function __construct(
        private readonly LlmProvider $provider,
        private readonly AssistantSettings $settings,
        private readonly ToolRegistry $tools,
        private readonly PromptBuilder $prompts,
        private readonly OutputGuard $guard,
    ) {}

    /**
     * @return array{reply: string, cards: list<array<string, mixed>>, flags: list<string>, message_id: int}
     */
    public function reply(AssistantConversation $conversation, string $userMessage): array
    {
        $startedAt = microtime(true);
        $this->store($conversation, AssistantMessage::ROLE_USER, ['content' => $userMessage]);

        if ($this->isBlocked($userMessage)) {
            return $this->finish($conversation, (string) $this->settings->get('off_topic_reply'), [], ['blocked_keyword'], 0, 0, $startedAt, []);
        }

        $system = $this->prompts->build($conversation);
        $declarations = $this->tools->declarations();
        $contents = $this->history($conversation);
        $context = new ToolContext($conversation, $this->settings);
        $options = [
            'model' => (string) $this->settings->get('model'),
            'temperature' => (float) $this->settings->get('temperature'),
            'max_output_tokens' => (int) $this->settings->get('max_output_tokens'),
        ];

        $maxRounds = max(1, (int) $this->settings->get('limits.max_tool_rounds', 4));
        $cards = [];
        $toolData = [];
        $tokensIn = 0;
        $tokensOut = 0;

        try {
            for ($round = 1; ; $round++) {
                // Last round: keep the declarations (history references them) but forbid new calls.
                $result = $this->provider->generate($system, $contents, $declarations, $round > $maxRounds ? ['tool_mode' => 'NONE'] + $options : $options);
                $tokensIn += $result->tokensIn;
                $tokensOut += $result->tokensOut;

                if (! $result->hasFunctionCalls() || $round > $maxRounds) {
                    $text = $result->text !== '' ? $result->text : 'ممكن توضح لي أكثر وش تحتاج؟ وأنا حاضر أساعدك.';

                    return $this->finish($conversation, $text, $cards, [], $tokensIn, $tokensOut, $startedAt, $toolData, $result->rawParts);
                }

                // Replay the model's parts unchanged (keeps Gemini thought signatures valid).
                $this->store($conversation, AssistantMessage::ROLE_MODEL, ['payload' => ['parts' => $result->rawParts]]);
                $contents[] = ['role' => 'model', 'parts' => $result->rawParts];

                $responseParts = [];
                foreach ($result->functionCalls as $call) {
                    $toolResult = $this->runTool($call['name'], $call['args'], $context);
                    $toolData[] = $toolResult->data;
                    if ($toolResult->card !== null) {
                        $cards[] = $toolResult->card;
                    }
                    $responseParts[] = ['functionResponse' => array_filter([
                        'name' => $call['name'],
                        'id' => $call['id'],
                        'response' => ['result' => $toolResult->data],
                    ], fn ($value) => $value !== null)];
                }

                $this->store($conversation, AssistantMessage::ROLE_TOOL, ['payload' => ['parts' => $responseParts]]);
                $contents[] = ['role' => 'user', 'parts' => $responseParts];
            }
        } catch (AssistantException $e) {
            Log::warning('AI assistant provider error', ['conversation' => $conversation->id, 'error' => $e->getMessage()]);

            return $this->finish($conversation, (string) $this->settings->get('unavailable_reply'), $cards, ['provider_error'], $tokensIn, $tokensOut, $startedAt, $toolData);
        }
    }

    /**
     * Gemini "contents" for the last N stored messages, starting at a user text turn.
     *
     * @return list<array{role: string, parts: list<array<string, mixed>>}>
     */
    private function history(AssistantConversation $conversation): array
    {
        $window = max(4, (int) $this->settings->get('limits.history_window', 16));
        $messages = $conversation->messages()->reorder('id', 'desc')->limit($window)->get()->reverse()->values();

        // Never start in the middle of a tool exchange.
        while ($messages->isNotEmpty() && ($messages->first()->role !== AssistantMessage::ROLE_USER)) {
            $messages->shift();
        }

        return $messages->map(fn (AssistantMessage $message) => match ($message->role) {
            AssistantMessage::ROLE_USER => ['role' => 'user', 'parts' => [['text' => (string) $message->content]]],
            AssistantMessage::ROLE_TOOL => ['role' => 'user', 'parts' => (array) ($message->payload['parts'] ?? [])],
            default => ['role' => 'model', 'parts' => (array) ($message->payload['parts'] ?? [['text' => (string) $message->content]])],
        })->filter(fn (array $content) => $content['parts'] !== [])->values()->all();
    }

    /**
     * @param  array<string, mixed>  $args
     */
    private function runTool(string $name, array $args, ToolContext $context): ToolResult
    {
        $tool = $this->tools->find($name);
        if ($tool === null) {
            return ToolResult::error("الأداة {$name} غير متاحة.");
        }

        try {
            return $tool->handle($args, $context);
        } catch (Throwable $e) {
            Log::warning('AI assistant tool failed', ['tool' => $name, 'error' => $e->getMessage()]);

            return ToolResult::error('حدث خطأ أثناء جلب البيانات، حاول بصيغة أخرى.');
        }
    }

    private function isBlocked(string $message): bool
    {
        foreach ((array) $this->settings->get('blocked_keywords', []) as $keyword) {
            $keyword = trim((string) $keyword);
            if ($keyword !== '' && mb_stripos($message, $keyword) !== false) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  list<array<string, mixed>>  $cards
     * @param  list<string>  $flags
     * @param  list<array<string, mixed>>  $toolData
     * @param  list<array<string, mixed>>  $rawParts
     * @return array{reply: string, cards: list<array<string, mixed>>, flags: list<string>, message_id: int}
     */
    private function finish(AssistantConversation $conversation, string $text, array $cards, array $flags, int $tokensIn, int $tokensOut, float $startedAt, array $toolData, array $rawParts = []): array
    {
        $checked = $this->guard->check($text, $toolData, (string) $this->settings->get('finance_disclaimer'));
        $flags = array_values(array_unique([...$flags, ...$checked['flags']]));

        $message = $this->store($conversation, AssistantMessage::ROLE_MODEL, [
            'content' => $checked['text'],
            'payload' => ['parts' => $rawParts !== [] ? $rawParts : [['text' => $checked['text']]]],
            'cards' => $cards ?: null,
            'guard_flags' => $flags ?: null,
            'tokens_in' => $tokensIn,
            'tokens_out' => $tokensOut,
            'latency_ms' => (int) round((microtime(true) - $startedAt) * 1000),
        ]);

        $conversation->forceFill([
            'messages_count' => $conversation->messages_count + 1,
            'tokens_in' => $conversation->tokens_in + $tokensIn,
            'tokens_out' => $conversation->tokens_out + $tokensOut,
            'provider' => $this->provider->name(),
            'model' => (string) $this->settings->get('model'),
            'last_activity_at' => now(),
        ])->save();

        return ['reply' => $checked['text'], 'cards' => $cards, 'flags' => $flags, 'message_id' => $message->id];
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function store(AssistantConversation $conversation, string $role, array $attributes): AssistantMessage
    {
        return $conversation->messages()->create(['role' => $role] + $attributes);
    }
}
