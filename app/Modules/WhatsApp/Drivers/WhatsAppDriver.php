<?php

declare(strict_types=1);

namespace App\Modules\WhatsApp\Drivers;

use App\Modules\WhatsApp\Support\InboundMessage;
use App\Modules\WhatsApp\Support\SendResult;
use App\Modules\WhatsApp\Support\StatusUpdate;
use Illuminate\Http\Request;

/**
 * A WhatsApp provider (Meta Cloud API or Twilio).
 */
interface WhatsAppDriver
{
    public function name(): string;

    public function sendText(string $toE164, string $body): SendResult;

    /**
     * Send an approved template (Meta template name / Twilio Content SID) with ordered body parameters.
     *
     * @param  array<string, mixed>  $notification  The event's notification settings
     * @param  list<string>  $parameters
     */
    public function sendTemplate(string $toE164, array $notification, array $parameters): SendResult;

    /**
     * @param  array<string, mixed>  $notification
     */
    public function hasTemplate(array $notification): bool;

    /**
     * @return array{ok: bool, message: string}
     */
    public function testConnection(): array;

    /** Verify the webhook really comes from the provider. */
    public function verifySignature(Request $request): bool;

    /**
     * @return array{messages: list<InboundMessage>, statuses: list<StatusUpdate>}
     */
    public function parseWebhook(Request $request): array;
}
