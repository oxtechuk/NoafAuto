<?php

declare(strict_types=1);

namespace App\Modules\AiAssistant\Tools;

/**
 * A function the model may call. Tools are the ONLY source of facts
 * (prices, installments, specs, availability) the assistant may state.
 */
interface AssistantTool
{
    public function name(): string;

    /**
     * Gemini function declaration (OpenAPI-subset schema, uppercase types).
     * Omit "parameters" for tools without arguments.
     *
     * @return array{name: string, description: string, parameters?: array<string, mixed>}
     */
    public function declaration(): array;

    /**
     * @param  array<string, mixed>  $args
     */
    public function handle(array $args, ToolContext $context): ToolResult;
}
