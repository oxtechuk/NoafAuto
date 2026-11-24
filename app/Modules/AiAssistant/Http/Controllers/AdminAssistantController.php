<?php

declare(strict_types=1);

namespace App\Modules\AiAssistant\Http\Controllers;

use App\Http\Api\Contracts\ApiResponse;
use App\Http\Controllers\Api\ApiBaseController;
use App\Models\Employee;
use App\Modules\AiAssistant\Contracts\LlmProvider;
use App\Modules\AiAssistant\Models\AssistantConversation;
use App\Modules\AiAssistant\Models\AssistantMessage;
use App\Modules\AiAssistant\Services\AssistantRunner;
use App\Modules\AiAssistant\Services\AssistantSettings;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Admin (React dashboard) endpoints: settings, connection test, playground, conversations, stats.
 */
class AdminAssistantController extends ApiBaseController
{
    public function settings(Request $request, AssistantSettings $settings): ApiResponse
    {
        $this->authorizeAdmin($request);

        return $this->respondSuccess($this->settingsPayload($settings));
    }

    public function updateSettings(Request $request, AssistantSettings $settings): ApiResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'api_key' => ['nullable', 'string', 'max:255'],
            'settings' => ['required', 'array'],
            'settings.enabled' => ['sometimes', 'boolean'],
            'settings.show_on_storefront' => ['sometimes', 'boolean'],
            'settings.model' => ['sometimes', 'string', 'max:100', 'regex:/^[\w.\-:\/]+$/'],
            'settings.temperature' => ['sometimes', 'numeric', 'between:0,2'],
            'settings.max_output_tokens' => ['sometimes', 'integer', 'between:128,8192'],
            'settings.assistant_name' => ['sometimes', 'string', 'max:60'],
            'settings.greeting' => ['sometimes', 'string', 'max:500'],
            'settings.bubble_title' => ['sometimes', 'string', 'max:80'],
            'settings.bubble_text' => ['sometimes', 'string', 'max:120'],
            'settings.tone' => ['sometimes', 'string', 'max:300'],
            'settings.quick_replies' => ['sometimes', 'array', 'max:6'],
            'settings.quick_replies.*' => ['string', 'max:60'],
            'settings.allowed_topics' => ['sometimes', 'array'],
            'settings.allowed_topics.*' => [Rule::in(array_keys(AssistantSettings::TOPICS))],
            'settings.blocked_topics' => ['sometimes', 'array'],
            'settings.blocked_topics.*' => [Rule::in(array_keys(AssistantSettings::BLOCKED))],
            'settings.custom_rules' => ['sometimes', 'nullable', 'string', 'max:3000'],
            'settings.blocked_keywords' => ['sometimes', 'array', 'max:100'],
            'settings.blocked_keywords.*' => ['string', 'max:60'],
            'settings.off_topic_reply' => ['sometimes', 'string', 'max:500'],
            'settings.finance_disclaimer' => ['sometimes', 'string', 'max:300'],
            'settings.unavailable_reply' => ['sometimes', 'string', 'max:300'],
            'settings.showroom' => ['sometimes', 'array'],
            'settings.showroom.*' => ['nullable', 'string', 'max:3000'],
            'settings.tools' => ['sometimes', 'array'],
            'settings.tools.*' => ['boolean'],
            'settings.show_prices' => ['sometimes', 'boolean'],
            'settings.max_results' => ['sometimes', 'integer', 'between:1,8'],
            'settings.lead_capture' => ['sometimes', Rule::in(['after_recommendation', 'on_request'])],
            'settings.limits' => ['sometimes', 'array'],
            'settings.limits.max_messages_per_session' => ['sometimes', 'integer', 'between:5,200'],
            'settings.limits.max_messages_per_hour_per_ip' => ['sometimes', 'integer', 'between:5,1000'],
            'settings.limits.daily_message_limit' => ['sometimes', 'integer', 'between:10,100000'],
            'settings.limits.max_tool_rounds' => ['sometimes', 'integer', 'between:1,8'],
            'settings.limits.max_message_length' => ['sometimes', 'integer', 'between:50,2000'],
            'settings.limits.history_window' => ['sometimes', 'integer', 'between:4,60'],
            'settings.retention_days' => ['sometimes', 'integer', 'between:1,3650'],
        ]);

        $values = $validated['settings'];
        unset($values['tools']);
        if (isset($validated['settings']['tools'])) {
            $values['tools'] = array_intersect_key($validated['settings']['tools'], array_flip(AssistantSettings::TOOLS));
        }
        if (isset($values['showroom'])) {
            $values['showroom'] = array_map(fn ($value) => (string) ($value ?? ''), $values['showroom']);
        }

        // api_key: absent/null = keep current, "" = remove, otherwise replace.
        $settings->update($values, $request->has('api_key') ? (string) ($validated['api_key'] ?? '') : null);

        return $this->respondSuccess($this->settingsPayload($settings->fresh()), 'تم حفظ إعدادات المساعد');
    }

    public function testConnection(Request $request, LlmProvider $provider): ApiResponse
    {
        $this->authorizeAdmin($request);
        $validated = $request->validate(['api_key' => ['nullable', 'string', 'max:255']]);

        $result = $provider->testConnection($validated['api_key'] ?? null);

        return $this->respond($result, $result['message'], $result['ok'] ? 200 : 422);
    }

    public function playground(Request $request, AssistantSettings $settings, AssistantRunner $runner, StoreAssistantController $store): ApiResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'session_id' => ['nullable', 'uuid'],
            'message' => ['required', 'string', 'max:2000'],
            'context' => ['nullable', 'array'],
        ]);

        if (! $settings->hasApiKey()) {
            return $this->respondError('أضف مفتاح Gemini API أولاً من الإعدادات.', 422);
        }

        return $this->respondSuccess($store->converse($request, $validated, $settings, $runner, 'playground'));
    }

    public function conversations(Request $request): ApiResponse
    {
        $this->authorizeAdmin($request);

        $conversations = AssistantConversation::query()
            ->with('lead:id,client_name,client_phone')
            ->when($request->input('channel'), fn ($q, $channel) => $q->where('channel', $channel))
            ->when($request->boolean('with_lead'), fn ($q) => $q->whereNotNull('lead_id'))
            ->latest('last_activity_at')
            ->paginate(min(50, max(5, $request->integer('per_page', 20))));

        return $this->respondPaginated($conversations, 'Conversations retrieved');
    }

    public function conversation(Request $request, AssistantConversation $conversation): ApiResponse
    {
        $this->authorizeAdmin($request);

        $conversation->load('lead:id,client_name,client_phone');

        return $this->respondSuccess([
            'conversation' => $conversation,
            'messages' => $conversation->messages()->get()->map(fn (AssistantMessage $message) => [
                'id' => $message->id,
                'role' => $message->role,
                'content' => $message->content,
                'tool_calls' => $message->role === AssistantMessage::ROLE_MODEL && $message->content === null
                    ? collect((array) ($message->payload['parts'] ?? []))->pluck('functionCall')->filter()->values()
                    : null,
                'cards' => $message->cards,
                'guard_flags' => $message->guard_flags,
                'tokens' => $message->tokens_in + $message->tokens_out,
                'created_at' => $message->created_at?->toIso8601String(),
            ]),
        ]);
    }

    public function stats(Request $request): ApiResponse
    {
        $this->authorizeAdmin($request);

        $since = now()->subDays(30);
        $storefront = AssistantConversation::query()->where('channel', 'storefront')->where('created_at', '>=', $since);

        return $this->respondSuccess([
            'period_days' => 30,
            'conversations' => (clone $storefront)->count(),
            'leads' => (clone $storefront)->whereNotNull('lead_id')->count(),
            'replies_today' => AssistantMessage::query()->where('role', AssistantMessage::ROLE_MODEL)->whereNotNull('content')->where('created_at', '>=', today())->count(),
            'tokens_in' => (int) (clone $storefront)->sum('tokens_in'),
            'tokens_out' => (int) (clone $storefront)->sum('tokens_out'),
            'flagged_replies' => AssistantMessage::query()->whereNotNull('guard_flags')->where('created_at', '>=', $since)->count(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function settingsPayload(AssistantSettings $settings): array
    {
        return [
            'settings' => $settings->all(),
            'api_key' => ['configured' => $settings->hasApiKey(), 'masked' => $settings->maskedApiKey()],
            'ready' => $settings->isReady(),
            'catalog' => [
                'topics' => AssistantSettings::TOPICS,
                'blocked' => AssistantSettings::BLOCKED,
                'tools' => AssistantSettings::TOOLS,
                'providers' => ['gemini' => 'Google Gemini'],
            ],
        ];
    }

    private function authorizeAdmin(Request $request): Employee
    {
        /** @var Employee|null $employee */
        $employee = $request->user('employee');

        if (! $employee || ! $employee->isAdmin()) {
            abort(403, 'Unauthorized. Admin access required.');
        }

        return $employee;
    }
}
