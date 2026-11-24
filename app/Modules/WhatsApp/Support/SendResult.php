<?php

declare(strict_types=1);

namespace App\Modules\WhatsApp\Support;

final class SendResult
{
    public function __construct(
        public readonly bool $ok,
        public readonly ?string $providerMessageId = null,
        public readonly ?string $error = null,
    ) {}

    public static function failed(string $error): self
    {
        return new self(false, null, $error);
    }
}
