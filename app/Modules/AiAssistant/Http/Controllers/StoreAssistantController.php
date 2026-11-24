<?php

declare(strict_types=1);

namespace App\Modules\AiAssistant\Http\Controllers;

use App\Http\Api\Contracts\ApiResponse;
use App\Http\Controllers\Api\ApiBaseController;
use App\Modules\AiAssistant\Models\AssistantConversation;
use App\Modules\AiAssistant\Models\AssistantMessage;
use App\Modules\AiAssistant\Services\AssistantRunner;
use App\Modules\AiAssistant\Services\AssistantSettings;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

/**
 * Public storefront endpoints for the chat widget. No API keys ever leave the server.
 */
class StoreAssistantController extends ApiBaseController
{
    public function config(AssistantSettings $settings): ApiResponse
    {
        if (! $settings->isReady() || ! $settings->get('show_on_storefront')) {
            return $this->respondSuccess(['enabled' => false]);
        }

        return $this->respondSuccess([
            'enabled' => true,
            'name' => $settings->get('assistant_name'),
            'greeting' => $settings->get('greeting'),
            'bubble_title' => $settings->get('bubble_title'),
            'bubble_text' => $settings->get('bubble_text'),
            'quick_replies' => array_values((array) $settings->get('quick_replies', [])),
            'max_message_length' => (int) $settings->get('limits.max_message_length'),
        ]);
    }

    public function chat(Request $request, AssistantSettings $settings, AssistantRunner $runner): ApiResponse
    {
        $validated = $request->validate([
            'session_id' => ['nullable', 'uuid'],
            'message' => ['required', 'string', 'max:'.max(50, (int) $settings->get('limits.max_message_length', 600))],
            'context' => ['nullable', 'array'],
            'context.path' => ['nullable', 'string', 'max:255'],
            'context.car_slug' => ['nullable', 'string', 'max:255'],
            'context.compare' => ['nullable', 'array', 'max:3'],
            'context.compare.*' => ['string', 'max:255'],
        ]);

        if (! $settings->isReady() || ! $settings->get('show_on_storefront')) {
            return $this->respondError((string) $settings->get('unavailable_reply'), 503);
        }

        $ipKey = 'ai-assistant:ip:'.sha1((string) $request->ip());
        if (! RateLimiter::attempt($ipKey, (int) $settings->get('limits.max_messages_per_hour_per_ip', 60), fn () => true, 3600)) {
            return $this->respondError('وصلت للحد المسموح من الرسائل حالياً، حاول بعد قليل أو تواصل معنا مباشرة.', 429);
        }

        $todayReplies = AssistantMessage::query()
            ->where('role', AssistantMessage::ROLE_MODEL)
            ->whereNotNull('content')
            ->where('created_at', '>=', today())
            ->count();
        if ($todayReplies >= (int) $settings->get('limits.daily_message_limit', 1000)) {
            return $this->respondError((string) $settings->get('unavailable_reply'), 503);
        }

        return $this->respondSuccess($this->converse($request, $validated, $settings, $runner, 'storefront'));
    }

    /**
     * Shared by the storefront chat and the admin playground.
     *
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    public function converse(Request $request, array $validated, AssistantSettings $settings, AssistantRunner $runner, string $channel): array
    {
        $conversation = AssistantConversation::query()->firstOrCreate(
            ['session_id' => $validated['session_id'] ?? (string) Str::uuid()],
            ['channel' => $channel, 'locale' => app()->getLocale(), 'ip_hash' => hash('sha256', (string) $request->ip())],
        );

        $conversation->page_context = array_filter((array) ($validated['context'] ?? []));
        $conversation->save();

        if ($conversation->messages_count >= (int) $settings->get('limits.max_messages_per_session', 40)) {
            return [
                'session_id' => $conversation->session_id,
                'reply' => 'وصلنا لنهاية هذه المحادثة. تقدر تبدأ محادثة جديدة، أو تتواصل مع المعرض مباشرة.',
                'cards' => [],
                'limit_reached' => true,
            ];
        }

        $result = $runner->reply($conversation, trim((string) $validated['message']));

        return [
            'session_id' => $conversation->session_id,
            'reply' => $result['reply'],
            'cards' => $result['cards'],
            'message_id' => $result['message_id'],
            'lead_registered' => (bool) $conversation->fresh()?->lead_id,
        ];
    }
}
