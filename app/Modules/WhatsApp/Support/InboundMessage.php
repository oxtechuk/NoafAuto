<?php

declare(strict_types=1);

namespace App\Modules\WhatsApp\Support;

final class InboundMessage
{
    /**
     * @param  array<string, mixed>  $raw
     */
    public function __construct(
        public readonly string $from,
        public readonly ?string $name,
        public readonly string $providerMessageId,
        public readonly string $type,
        public readonly ?string $body,
        public readonly array $raw = [],
    ) {}
}
