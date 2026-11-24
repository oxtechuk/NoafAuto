<?php

declare(strict_types=1);

namespace App\Modules\WhatsApp\Http\Controllers;

use App\Http\Api\Contracts\ApiResponse;
use App\Http\Controllers\Api\ApiBaseController;
use App\Models\Employee;
use App\Modules\WhatsApp\Jobs\ReplyWithAssistant;
use App\Modules\WhatsApp\Models\WhatsAppConversation;
use App\Modules\WhatsApp\Models\WhatsAppMessage;
use App\Modules\WhatsApp\Services\WhatsAppManager;
use App\Modules\WhatsApp\Services\WhatsAppSettings;
use App\Modules\WhatsApp\Support\PhoneNumber;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminWhatsAppController extends ApiBaseController
{
    public function settings(Request $request, WhatsAppSettings $settings): ApiResponse
    {
        $this->authorizeAdmin($request);

        return $this->respondSuccess($this->settingsPayload($settings));
    }

    public function updateSettings(Request $request, WhatsAppSettings $settings): ApiResponse
    {
        $this->authorizeAdmin($request);

        $notificationRules = [];
        foreach (array_keys(WhatsAppSettings::EVENTS) as $event) {
            $notificationRules += [
                "settings.notifications.{$event}.enabled" => ['sometimes', 'boolean'],
                "settings.notifications.{$event}.text" => ['sometimes', 'nullable', 'string', 'max:1024'],
                "settings.notifications.{$event}.template_name" => ['sometimes', 'nullable', 'string', 'max:512', 'regex:/^[a-z0-9_]*$/'],
                "settings.notifications.{$event}.template_language" => ['sometimes', 'nullable', 'string', 'max:15'],
                "settings.notifications.{$event}.template_params" => ['sometimes', 'array', 'max:10'],
                "settings.notifications.{$event}.template_params.*" => [Rule::in(WhatsAppSettings::EVENTS[$event]['variables'])],
                "settings.notifications.{$event}.twilio_content_sid" => ['sometimes', 'nullable', 'string', 'max:64', 'regex:/^(HX[0-9a-f]{32})?$/i'],
            ];
        }

        $validated = $request->validate([
            'settings' => ['required', 'array'],
            'settings.enabled' => ['sometimes', 'boolean'],
            'settings.provider' => ['sometimes', Rule::in(array_keys(WhatsAppSettings::PROVIDERS))],
            'settings.default_country_code' => ['sometimes', 'string', 'regex:/^\d{1,4}$/'],
            'settings.twilio.account_sid' => ['sometimes', 'nullable', 'string', 'max:64'],
            'settings.twilio.from_number' => ['sometimes', 'nullable', 'string', 'max:40'],
            'settings.twilio.validate_signature' => ['sometimes', 'boolean'],
            'settings.meta.phone_number_id' => ['sometimes', 'nullable', 'string', 'max:40', 'regex:/^\d*$/'],
            'settings.meta.business_account_id' => ['sometimes', 'nullable', 'string', 'max:40', 'regex:/^\d*$/'],
            'settings.meta.graph_version' => ['sometimes', 'string', 'regex:/^v\d+\.\d+$/'],
            'settings.inbound.create_lead' => ['sometimes', 'boolean'],
            'settings.inbound.auto_reply' => ['sometimes', Rule::in(['off', 'ai', 'static'])],
            'settings.inbound.static_reply' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'settings.inbound.human_pause_hours' => ['sometimes', 'integer', 'between:0,168'],
            'secrets' => ['sometimes', 'array'],
            'secrets.twilio.auth_token' => ['sometimes', 'nullable', 'string', 'max:128'],
            'secrets.meta.access_token' => ['sometimes', 'nullable', 'string', 'max:1024'],
            'secrets.meta.app_secret' => ['sometimes', 'nullable', 'string', 'max:128'],
            ...$notificationRules,
        ]);

        $values = $validated['settings'];
        unset($values['meta']['verify_token']); // generated server-side only
        $values = array_map(fn ($value) => is_array($value) ? $this->stringifyNulls($value) : $value, $values);

        // Secrets: absent/null = keep, "" = remove.
        $secrets = [];
        foreach ((array) ($request->input('secrets') ?? []) as $provider => $fields) {
            foreach ((array) $fields as $field => $value) {
                if ($value !== null) {
                    $secrets[$provider][$field] = (string) $value;
                }
            }
        }

        $settings->update($values, $secrets);

        return $this->respondSuccess($this->settingsPayload($settings->fresh()), 'تم حفظ إعدادات واتساب');
    }

    public function testConnection(Request $request, WhatsAppManager $manager): ApiResponse
    {
        $this->authorizeAdmin($request);
        $result = $manager->driver()->testConnection();

        return $this->respond($result, $result['message'], $result['ok'] ? 200 : 422);
    }

    public function testSend(Request $request, WhatsAppManager $manager, WhatsAppSettings $settings): ApiResponse
    {
        $this->authorizeAdmin($request);
        $validated = $request->validate([
            'to' => ['required', 'string', 'max:30'],
            'event' => ['nullable', Rule::in(array_keys(WhatsAppSettings::EVENTS))],
            'text' => ['nullable', 'string', 'max:1000'],
        ]);

        if (! $manager->isConfigured()) {
            return $this->respondError('أكمل بيانات الربط واحفظها أولاً.', 422);
        }

        $sample = ['customer_name' => 'عميل تجريبي', 'car_name' => 'تويوتا كامري 2025', 'status' => 'تمت الموافقة', 'name' => 'عميل تجريبي', 'phone' => $validated['to']];
        $id = $manager->send($validated['to'], (string) ($validated['text'] ?? 'رسالة تجريبية من نظام المعرض ✅'), $validated['event'] ?? null, $sample);

        $last = WhatsAppMessage::query()->where('direction', 'out')->latest('id')->first();

        return $id !== false
            ? $this->respondSuccess(['message_id' => $id], 'تم إرسال الرسالة التجريبية')
            : $this->respondError('فشل الإرسال: '.($last?->error ?? 'الإشعار متوقف أو بدون نص'), 422);
    }

    public function conversations(Request $request): ApiResponse
    {
        $this->authorizeAdmin($request);

        $search = trim((string) $request->input('search', ''));
        $conversations = WhatsAppConversation::query()
            ->with(['lead:id,client_name,client_phone', 'messages' => fn ($q) => $q->latest('id')->limit(1)])
            ->when($search !== '', fn ($q) => $q->where(fn ($q) => $q->where('phone', 'like', '%'.PhoneNumber::normalize($search).'%')->orWhere('name', 'like', "%{$search}%")))
            ->when($request->boolean('unread'), fn ($q) => $q->where('unread_count', '>', 0))
            ->orderByDesc('last_message_at')
            ->paginate(min(50, max(10, $request->integer('per_page', 25))));

        $conversations->getCollection()->transform(fn (WhatsAppConversation $c) => [
            'id' => $c->id,
            'phone' => $c->phone,
            'name' => $c->name ?? $c->lead?->client_name,
            'lead_id' => $c->lead_id,
            'unread_count' => $c->unread_count,
            'within_window' => $c->isWithinServiceWindow(),
            'ai_paused_until' => $c->ai_paused_until?->toIso8601String(),
            'last_message' => $c->messages->first()?->body,
            'last_message_at' => $c->last_message_at?->toIso8601String(),
        ]);

        return $this->respondPaginated($conversations, 'Conversations retrieved');
    }

    public function messages(Request $request, WhatsAppConversation $conversation): ApiResponse
    {
        $this->authorizeAdmin($request);
        $conversation->forceFill(['unread_count' => 0])->save();

        return $this->respondSuccess([
            'conversation' => [
                'id' => $conversation->id,
                'phone' => $conversation->phone,
                'name' => $conversation->name,
                'lead_id' => $conversation->lead_id,
                'within_window' => $conversation->isWithinServiceWindow(),
                'ai_paused_until' => $conversation->ai_paused_until?->toIso8601String(),
            ],
            'messages' => $conversation->messages()->with('sender:id,name')->latest('id')->limit(200)->get()->reverse()->values()->map(fn (WhatsAppMessage $m) => [
                'id' => $m->id,
                'direction' => $m->direction,
                'type' => $m->type,
                'body' => $m->body,
                'event' => $m->event,
                'status' => $m->status,
                'error' => $m->error,
                'sent_by' => $m->sender?->name,
                'created_at' => $m->created_at?->toIso8601String(),
            ]),
        ]);
    }

    public function reply(Request $request, WhatsAppConversation $conversation, WhatsAppManager $manager, WhatsAppSettings $settings): ApiResponse
    {
        $employee = $this->authorizeAdmin($request);
        $validated = $request->validate(['text' => ['required', 'string', 'max:4000']]);

        if ($settings->provider() === 'meta' && ! $conversation->isWithinServiceWindow()) {
            return $this->respondError('مرّت أكثر من 24 ساعة على آخر رسالة من العميل؛ واتساب يسمح فقط بالقوالب المعتمدة في هذه الحالة.', 422);
        }

        $message = $manager->sendToConversation($conversation, $validated['text'], 'agent_reply', $employee->id);

        // A human took over: pause the AI auto reply for this customer.
        $hours = (int) $settings->get('inbound.human_pause_hours', 12);
        if ($hours > 0) {
            $conversation->forceFill(['ai_paused_until' => now()->addHours($hours)])->save();
        }

        return $message->status === 'failed'
            ? $this->respondError('فشل الإرسال: '.$message->error, 422)
            : $this->respondSuccess(['id' => $message->id, 'status' => $message->status], 'تم الإرسال');
    }

    public function resumeAi(Request $request, WhatsAppConversation $conversation): ApiResponse
    {
        $this->authorizeAdmin($request);
        $conversation->forceFill(['ai_paused_until' => null])->save();

        return $this->respondSuccess(null, 'تم تشغيل الرد التلقائي لهذا العميل');
    }

    public function log(Request $request): ApiResponse
    {
        $this->authorizeAdmin($request);

        $messages = WhatsAppMessage::query()
            ->with('conversation:id,phone,name')
            ->where('direction', 'out')
            ->when($request->input('status'), fn ($q, $status) => $q->where('status', $status))
            ->when($request->input('event'), fn ($q, $event) => $q->where('event', $event))
            ->latest('id')
            ->paginate(min(100, max(10, $request->integer('per_page', 30))));

        return $this->respondPaginated($messages, 'Messages retrieved');
    }

    public function stats(Request $request): ApiResponse
    {
        $this->authorizeAdmin($request);
        $since = now()->subDays(30);

        $outbound = WhatsAppMessage::query()->where('direction', 'out')->where('created_at', '>=', $since);

        return $this->respondSuccess([
            'period_days' => 30,
            'sent' => (clone $outbound)->whereIn('status', ['sent', 'delivered', 'read'])->count(),
            'delivered' => (clone $outbound)->whereIn('status', ['delivered', 'read'])->count(),
            'read' => (clone $outbound)->where('status', 'read')->count(),
            'failed' => (clone $outbound)->where('status', 'failed')->count(),
            'received' => WhatsAppMessage::query()->where('direction', 'in')->where('created_at', '>=', $since)->count(),
            'unread_conversations' => WhatsAppConversation::query()->where('unread_count', '>', 0)->count(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function settingsPayload(WhatsAppSettings $settings): array
    {
        return [
            'settings' => $settings->all(),
            'secrets' => $settings->secretStatus(),
            'configured' => $settings->isConfigured(),
            'webhooks' => [
                'meta' => route('whatsapp.webhook.meta'),
                'twilio' => route('whatsapp.webhook.twilio'),
            ],
            'ai_assistant_available' => ReplyWithAssistant::assistantAvailable(),
            'catalog' => [
                'providers' => WhatsAppSettings::PROVIDERS,
                'events' => WhatsAppSettings::EVENTS,
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $values
     * @return array<string, mixed>
     */
    private function stringifyNulls(array $values): array
    {
        return array_map(fn ($value) => is_array($value) ? $this->stringifyNulls($value) : ($value ?? ''), $values);
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
