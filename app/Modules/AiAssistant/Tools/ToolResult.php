<?php

declare(strict_types=1);

namespace App\Modules\AiAssistant\Tools;

/**
 * What a tool returns: data for the model, and optionally a card the
 * storefront renders with its own design (cars, comparison, installment…).
 */
final class ToolResult
{
    /**
     * @param  array<string, mixed>  $data
     * @param  array<string, mixed>|null  $card
     */
    public function __construct(
        public readonly array $data,
        public readonly ?array $card = null,
    ) {}

    public static function error(string $message): self
    {
        return new self(['error' => $message]);
    }
}
