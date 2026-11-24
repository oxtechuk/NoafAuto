<?php

declare(strict_types=1);

namespace App\Services\Updates;

/**
 * HMAC-SHA256 signatures for webhooks exchanged with GitHub Actions.
 *
 * Header format (same as GitHub webhooks): "X-Sitekit-Signature: sha256=<hex>".
 */
class WebhookSignature
{
    public const HEADER = 'X-Sitekit-Signature';

    public function sign(string $payload): ?string
    {
        $secret = $this->secret();

        return $secret === null ? null : 'sha256='.hash_hmac('sha256', $payload, $secret);
    }

    public function isValid(string $payload, ?string $signature): bool
    {
        $expected = $this->sign($payload);

        if ($expected === null || $signature === null || $signature === '') {
            return false;
        }

        return hash_equals($expected, trim($signature));
    }

    public function isConfigured(): bool
    {
        return $this->secret() !== null;
    }

    private function secret(): ?string
    {
        $secret = (string) config('sitekit.deploy_secret');

        return $secret !== '' ? $secret : null;
    }
}
