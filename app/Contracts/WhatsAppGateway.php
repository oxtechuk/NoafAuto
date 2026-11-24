<?php

declare(strict_types=1);

namespace App\Contracts;

/**
 * Outbound WhatsApp channel used by the core (booking notifications, campaigns).
 *
 * Implemented by the WhatsApp module (Meta Cloud API or Twilio). When the module
 * is missing or not connected, the core falls back to the legacy Twilio settings.
 */
interface WhatsAppGateway
{
    public function isConfigured(): bool;

    /**
     * Send a message to a customer.
     *
     * @param  string|null  $event  Notification key (e.g. "booking_created") so the module can use the
     *                              showroom's approved template and on/off switch for that event.
     * @param  array<string, string>  $variables  Values for the template placeholders ({customer_name}, …).
     * @return string|false Provider message id, or false when not sent.
     */
    public function send(string $to, string $text, ?string $event = null, array $variables = []): string|false;
}
