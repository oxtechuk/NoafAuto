<?php

declare(strict_types=1);

namespace App\Modules\AiAssistant\Support;

/**
 * One model response: final text and/or tool calls, plus the raw parts that
 * must be replayed unchanged in the next request (Gemini thought signatures).
 */
final class LlmResult
{
    /**
     * @param  list<array{id: ?string, name: string, args: array<string, mixed>}>  $functionCalls
     * @param  list<array<string, mixed>>  $rawParts
     */
    public function __construct(
        public readonly string $text,
        public readonly array $functionCalls,
        public readonly array $rawParts,
        public readonly int $tokensIn = 0,
        public readonly int $tokensOut = 0,
        public readonly ?string $finishReason = null,
    ) {}

    public function hasFunctionCalls(): bool
    {
        return $this->functionCalls !== [];
    }
}
