<?php

declare(strict_types=1);

namespace App\Modules\WhatsApp\Services;

use App\Contracts\WhatsAppGateway;
use App\Modules\WhatsApp\Drivers\MetaCloudDriver;
use App\Modules\WhatsApp\Drivers\TwilioDriver;
use App\Modules\WhatsApp\Drivers\WhatsAppDriver;
use App\Modules\WhatsApp\Models\WhatsAppConversation;
use App\Modules\WhatsApp\Models\WhatsAppMessage;
use App\Modules\WhatsApp\Support\PhoneNumber;
use App\Modules\WhatsApp\Support\SendResult;

/**
 * The showroom's WhatsApp channel: sends (with approved templates for
 * notifications), logs every message and keeps the inbox conversations.
 */
class WhatsAppManager implements WhatsAppGateway
{
    public function __construct(private readonly WhatsAppSettings $settings) {}

    public function driver(?string $provider = null): WhatsAppDriver
    {
        return match ($provider ?? $this->settings->provider()) {
            'twilio' => new TwilioDriver($this->settings),
            default => new MetaCloudDriver($this->settings),
        };
    }

    public function isConfigured(): bool
    {
        return $this->settings->isConfigured();
    }

    public function send(string $to, string $text, ?string $event = null, array $variables = []): string|false
    {
        if (! $this->isConfigured() || trim($to) === '') {
            return false;
        }

        $notification = $event !== null ? $this->settings->get("notifications.{$event}") : null;
        if (is_array($notification) && ! ($notification['enabled'] ?? true)) {
            return false;
        }

        // The showroom's own text (admin → واتساب → الإشعارات) overrides the text built by the core.
        if (is_array($notification) && trim((string) ($notification['text'] ?? '')) !== '') {
            $text = $this->render((string) $notification['text'], $variables);
        }

        $driver = $this->driver();
        $useTemplate = is_array($notification) && $driver->hasTemplate($notification);
        if (! $useTemplate && trim($text) === '') {
            return false;
        }

        $phone = PhoneNumber::normalize($to, (string) $this->settings->get('default_country_code', '966'));
        $conversation = $this->conversation($phone, $variables['customer_name'] ?? $variables['name'] ?? null);

        $result = $useTemplate
            ? $driver->sendTemplate($phone, $notification, $this->templateParameters($notification, $variables))
            : $driver->sendText($phone, $text);

        $this->log($conversation, $result, $useTemplate ? 'template' : 'text', $useTemplate ? ($text ?: $notification['template_name']) : $text, $event);

        return $result->ok ? (string) $result->providerMessageId : false;
    }

    /**
     * Free-form message inside an existing conversation (agent reply, AI reply, auto reply).
     */
    public function sendToConversation(WhatsAppConversation $conversation, string $text, string $event, ?int $sentBy = null): WhatsAppMessage
    {
        $result = $this->isConfigured()
            ? $this->driver()->sendText($conversation->phone, $text)
            : SendResult::failed('قناة واتساب غير مربوطة');

        return $this->log($conversation, $result, 'text', $text, $event, $sentBy);
    }

    public function conversation(string $phoneE164, ?string $name = null): WhatsAppConversation
    {
        $conversation = WhatsAppConversation::query()->firstOrNew(['phone' => $phoneE164]);
        if ($name && ! $conversation->name) {
            $conversation->name = $name;
        }
        $conversation->save();

        return $conversation;
    }

    /**
     * @param  array<string, string>  $variables
     */
    public function render(string $template, array $variables): string
    {
        $replacements = [];
        foreach ($variables as $key => $value) {
            $replacements['{'.$key.'}'] = (string) $value;
        }

        return strtr($template, $replacements);
    }

    /**
     * @param  array<string, mixed>  $notification
     * @param  array<string, string>  $variables
     * @return list<string>
     */
    private function templateParameters(array $notification, array $variables): array
    {
        return array_values(array_map(
            fn (string $key) => (string) ($variables[$key] ?? '-'),
            array_filter((array) ($notification['template_params'] ?? []), 'is_string'),
        ));
    }

    private function log(WhatsAppConversation $conversation, SendResult $result, string $type, string $body, ?string $event, ?int $sentBy = null): WhatsAppMessage
    {
        $message = $conversation->messages()->create([
            'direction' => 'out',
            'provider' => $this->settings->provider(),
            'type' => $type,
            'body' => $body,
            'event' => $event,
            'provider_message_id' => $result->providerMessageId ?: null,
            'status' => $result->ok ? 'sent' : 'failed',
            'error' => $result->error,
            'sent_by' => $sentBy,
        ]);

        $conversation->forceFill(['last_message_at' => now()])->save();

        return $message;
    }
}
