<?php

declare(strict_types=1);

namespace App\Modules\WhatsApp\Support;

final class StatusUpdate
{
    /**
     * @param  string|null  $pricingCategory  Meta pricing category (marketing, utility, authentication, service...)
     * @param  bool|null  $billable  whether Meta charges this message (null = not reported)
     */
    public function __construct(
        public readonly string $providerMessageId,
        public readonly string $status,
        public readonly ?string $error = null,
        public readonly ?string $pricingCategory = null,
        public readonly ?bool $billable = null,
    ) {}
}
