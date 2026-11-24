<?php

declare(strict_types=1);

namespace App\Modules\WhatsApp\Support;

final class StatusUpdate
{
    public function __construct(
        public readonly string $providerMessageId,
        public readonly string $status,
        public readonly ?string $error = null,
    ) {}
}
