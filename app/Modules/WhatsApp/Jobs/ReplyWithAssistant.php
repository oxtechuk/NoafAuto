<?php

declare(strict_types=1);

namespace App\Modules\WhatsApp\Jobs;

use App\Modules\AiAssistant\Models\AssistantConversation;
use App\Modules\AiAssistant\Services\AssistantRunner;
use App\Modules\AiAssistant\Services\AssistantSettings;
use App\Modules\WhatsApp\Models\WhatsAppConversation;
use App\Modules\WhatsApp\Models\WhatsAppMessage;
use App\Modules\WhatsApp\Services\WhatsAppManager;
use App\Services\Modules\ModuleManager;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Support\Str;

/**
 * Answers an incoming WhatsApp message with the AI assistant module (same tools,
 * rules and showroom settings as the storefront chat). Runs after the webhook
 * response so the provider gets its 200 immediately.
 */
class ReplyWithAssistant
{
    use Dispatchable;

    public function __construct(
        public int $conversationId,
        public int $messageId,
    ) {}

    public static function assistantAvailable(): bool
    {
        $module = app(ModuleManager::class)->find('ai-assistant');

        return ($module['enabled'] ?? false) === true
            && class_exists(AssistantRunner::class)
            && app(AssistantSettings::class)->isReady();
    }

    public function handle(WhatsAppManager $manager): void
    {
        $conversation = WhatsAppConversation::find($this->conversationId);
        $message = WhatsAppMessage::find($this->messageId);
        if (! $conversation || ! $message || ! self::assistantAvailable()) {
            return;
        }

        if (! $conversation->assistant_session_id) {
            $conversation->forceFill(['assistant_session_id' => (string) Str::uuid()])->save();
        }

        $assistantConversation = AssistantConversation::query()->firstOrCreate(
            ['session_id' => $conversation->assistant_session_id],
            ['channel' => 'whatsapp', 'locale' => 'ar', 'lead_id' => $conversation->lead_id],
        );

        $settings = app(AssistantSettings::class);
        if ($assistantConversation->messages_count >= (int) $settings->get('limits.max_messages_per_session', 40)) {
            // Start a fresh assistant session instead of going silent on a long-running WhatsApp thread.
            $conversation->forceFill(['assistant_session_id' => (string) Str::uuid()])->save();
            $assistantConversation = AssistantConversation::create(['session_id' => $conversation->assistant_session_id, 'channel' => 'whatsapp', 'locale' => 'ar', 'lead_id' => $conversation->lead_id]);
        }

        $result = app(AssistantRunner::class)->reply($assistantConversation, (string) $message->body);

        $manager->sendToConversation($conversation, $this->toWhatsAppText($result['reply'], $result['cards']), 'ai_reply');
    }

    /**
     * WhatsApp has no rich cards: render the assistant's cards as short text lines with links.
     *
     * @param  list<array<string, mixed>>  $cards
     */
    private function toWhatsAppText(string $reply, array $cards): string
    {
        $lines = [trim($reply)];

        foreach ($cards as $card) {
            switch ($card['type'] ?? null) {
                case 'cars':
                    foreach (array_slice((array) $card['cars'], 0, 4) as $car) {
                        $price = isset($car['price']) ? ' — '.number_format((float) $car['price']).' ريال' : '';
                        $monthly = isset($car['monthly_from']) ? ' (قسط من '.number_format((float) $car['monthly_from']).')' : '';
                        $lines[] = "🚗 {$car['name']}{$price}{$monthly}\n".url((string) $car['url']);
                    }
                    break;
                case 'installment':
                    $best = (array) ($card['best_option'] ?? []);
                    $lines[] = '💳 القسط التقديري: '.number_format((float) ($best['monthly'] ?? 0)).' ريال/شهر — '.($best['bank'] ?? '').' — '.($card['months'] ?? '').' شهر';
                    break;
                case 'comparison':
                    $lines[] = '📊 المقارنة الكاملة: '.url('/compare');
                    break;
                case 'lead_created':
                    $lines[] = '✅ تم تسجيل طلبك رقم '.($card['lead_id'] ?? '').' وبيتواصل معك موظف قريباً.';
                    break;
            }
        }

        return mb_substr(implode("\n\n", array_filter($lines)), 0, 4000);
    }
}
