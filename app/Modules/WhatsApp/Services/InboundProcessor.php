<?php

declare(strict_types=1);

namespace App\Modules\WhatsApp\Services;

use App\Models\ContactSource;
use App\Models\Lead;
use App\Modules\WhatsApp\Jobs\ReplyWithAssistant;
use App\Modules\WhatsApp\Models\WhatsAppConversation;
use App\Modules\WhatsApp\Models\WhatsAppMessage;
use App\Modules\WhatsApp\Support\InboundMessage;
use App\Modules\WhatsApp\Support\PhoneNumber;
use App\Modules\WhatsApp\Support\StatusUpdate;
use App\Services\BookingAssignmentService;
use Throwable;

/**
 * Stores incoming WhatsApp messages, links them to the CRM and triggers the auto reply.
 */
class InboundProcessor
{
    public const LEAD_SOURCE = 'واتساب';

    public function __construct(
        private readonly WhatsAppSettings $settings,
        private readonly WhatsAppManager $manager,
    ) {}

    public function handleMessage(InboundMessage $inbound): ?WhatsAppMessage
    {
        if ($inbound->providerMessageId === '' || WhatsAppMessage::query()->where('provider_message_id', $inbound->providerMessageId)->exists()) {
            return null; // providers retry webhooks: process each message once
        }

        $phone = PhoneNumber::normalize($inbound->from, (string) $this->settings->get('default_country_code', '966'));
        $conversation = $this->manager->conversation($phone, $inbound->name);

        $message = $conversation->messages()->create([
            'direction' => 'in',
            'provider' => $this->settings->provider(),
            'type' => $inbound->type,
            'body' => $inbound->body,
            'provider_message_id' => $inbound->providerMessageId,
            'status' => 'received',
            'payload' => $inbound->raw,
        ]);

        $conversation->forceFill([
            'last_inbound_at' => now(),
            'last_message_at' => now(),
            'unread_count' => $conversation->unread_count + 1,
        ])->save();

        $this->linkLead($conversation, $inbound);
        $this->autoReply($conversation, $message);

        return $message;
    }

    public function handleStatus(StatusUpdate $update): void
    {
        if ($update->providerMessageId === '' || $update->status === '') {
            return;
        }

        WhatsAppMessage::query()->where('provider_message_id', $update->providerMessageId)->first()?->advanceStatus($update->status, $update->error);
    }

    private function linkLead(WhatsAppConversation $conversation, InboundMessage $inbound): void
    {
        if ($conversation->lead_id) {
            return;
        }

        $lead = Lead::query()->whereIn('client_phone', PhoneNumber::variants($conversation->phone))->latest('id')->first();

        if (! $lead && $this->settings->get('inbound.create_lead', true)) {
            $source = ContactSource::firstOrCreate(['name' => self::LEAD_SOURCE], ['is_active' => true]);
            $lead = Lead::create([
                'client_name' => $inbound->name ?: 'عميل واتساب',
                'client_phone' => $conversation->phone,
                'subject' => 'general_inquiry',
                'status_details' => 'أول رسالة واتساب: '.mb_substr((string) $inbound->body, 0, 500),
                'contact_source_id' => $source->id,
                'status' => 'new',
                'started_at' => now(),
                'marketing_channel' => self::LEAD_SOURCE,
            ]);

            try {
                app(BookingAssignmentService::class)->autoAssignLead($lead);
            } catch (Throwable) {
                // best effort
            }
        }

        if ($lead) {
            $conversation->forceFill(['lead_id' => $lead->id])->save();
        }
    }

    private function autoReply(WhatsAppConversation $conversation, WhatsAppMessage $message): void
    {
        if (trim((string) $message->body) === '' || ($conversation->ai_paused_until && $conversation->ai_paused_until->isFuture())) {
            return;
        }

        $mode = (string) $this->settings->get('inbound.auto_reply', 'off');

        if ($mode === 'ai' && ReplyWithAssistant::assistantAvailable()) {
            ReplyWithAssistant::dispatchAfterResponse($conversation->id, $message->id);

            return;
        }

        if ($mode === 'static') {
            $recentlyReplied = $conversation->messages()
                ->where('direction', 'out')
                ->where('event', 'auto_reply')
                ->where('created_at', '>=', now()->subHours(12))
                ->exists();

            $reply = trim((string) $this->settings->get('inbound.static_reply', ''));
            if (! $recentlyReplied && $reply !== '') {
                $this->manager->sendToConversation($conversation, $reply, 'auto_reply');
            }
        }
    }
}
