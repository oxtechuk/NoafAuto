<?php

declare(strict_types=1);

namespace App\Modules\AiAssistant\Contracts;

use App\Modules\AiAssistant\Support\LlmResult;

/**
 * A chat model provider (Gemini today; others can implement the same contract).
 *
 * Conversation "contents" use the neutral shape the runner stores:
 *   ['role' => 'user'|'model', 'parts' => [ ['text' => ...] | ['functionCall' => ...] | ['functionResponse' => ...] ]]
 * which maps 1:1 to Gemini; another driver converts it in its own adapter.
 */
interface LlmProvider
{
    public function name(): string;

    /**
     * @param  list<array{role: string, parts: list<array<string, mixed>>}>  $contents
     * @param  list<array{name: string, description: string, parameters: array<string, mixed>}>  $tools
     * @param  array{model?: string, temperature?: float, max_output_tokens?: int, tool_mode?: 'AUTO'|'NONE'}  $options
     */
    public function generate(string $system, array $contents, array $tools, array $options = []): LlmResult;

    /**
     * Verify the configured key/model work.
     *
     * @return array{ok: bool, message: string, models: list<string>}
     */
    public function testConnection(?string $apiKey = null): array;
}
