<?php

declare(strict_types=1);

namespace App\Modules\WhatsApp\Http\Controllers;

use App\Http\Api\Contracts\ApiResponse;
use App\Http\Controllers\Api\ApiBaseController;
use App\Models\Booking;
use App\Models\Employee;
use App\Models\Lead;
use App\Models\LeadNote;
use App\Modules\WhatsApp\Drivers\MetaCloudDriver;
use App\Modules\WhatsApp\Jobs\ReplyWithAssistant;
use App\Modules\WhatsApp\Models\WhatsAppConversation;
use App\Modules\WhatsApp\Models\WhatsAppMessage;
use App\Modules\WhatsApp\Models\WhatsAppTemplate;
use App\Modules\WhatsApp\Services\LeadLinker;
use App\Modules\WhatsApp\Services\MetaOnboarding;
use App\Modules\WhatsApp\Services\TemplateSync;
use App\Modules\WhatsApp\Services\WhatsAppManager;
use App\Modules\WhatsApp\Services\WhatsAppSettings;
use App\Modules\WhatsApp\Support\PhoneNumber;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Gate;
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
            'settings.inbox.auto_assign' => ['sometimes', 'boolean'],
            'settings.inbox.hide_phone_from_sales' => ['sometimes', 'boolean'],
            'settings.inbox.preset_tags' => ['sometimes', 'array', 'max:30'],
            'settings.inbox.preset_tags.*' => ['string', 'distinct', 'min:1', 'max:30'],
            'settings.pricing.rates' => ['sometimes', 'array:'.implode(',', WhatsAppSettings::PRICED_CATEGORIES)],
            'settings.pricing.rates.*' => ['numeric', 'between:0,100'],
            'secrets' => ['sometimes', 'array'],
            'secrets.twilio.auth_token' => ['sometimes', 'nullable', 'string', 'max:128'],
            'secrets.meta.access_token' => ['sometimes', 'nullable', 'string', 'max:1024'],
            'secrets.meta.app_secret' => ['sometimes', 'nullable', 'string', 'max:128'],
            ...$notificationRules,
        ]);

        $values = $validated['settings'];
        unset($values['meta']['verify_token'], $values['meta']['connection'], $values['meta']['connected_at']); // server-side only
        $values = array_map(fn ($value) => is_array($value) ? $this->stringifyNulls($value) : $value, $values);
        if (isset($values['pricing']['rates'])) {
            $values['pricing']['rates'] = array_map(fn ($rate) => (float) $rate, $values['pricing']['rates']);
        }

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
        Cache::forget(MetaOnboarding::healthCacheKey());

        return $this->respondSuccess($this->settingsPayload($settings->fresh()), 'تم حفظ إعدادات واتساب');
    }

    /**
     * Finish WhatsApp Embedded Signup with what the Meta popup returned.
     */
    public function completeEmbeddedSignup(Request $request, MetaOnboarding $onboarding, WhatsAppSettings $settings): ApiResponse
    {
        $this->authorizeAdmin($request);
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:2048'],
            'waba_id' => ['required', 'string', 'regex:/^\d{5,40}$/'],
            'phone_number_id' => ['required', 'string', 'regex:/^\d{5,40}$/'],
        ]);

        $result = $onboarding->complete($validated['code'], $validated['waba_id'], $validated['phone_number_id'], route('whatsapp.webhook.meta'));

        if (! $result['ok']) {
            return $this->respondError($result['message'], 422);
        }

        return $this->respondSuccess([
            ...$this->settingsPayload($settings->fresh()),
            'warnings' => $result['warnings'] ?? [],
        ], $result['message']);
    }

    /** Number health from Meta (cached 10 minutes; ?refresh=1 forces a check). */
    public function health(Request $request, MetaOnboarding $onboarding, MetaCloudDriver $driver, WhatsAppSettings $settings): ApiResponse
    {
        $this->authorizeAdmin($request);

        if ($settings->provider() !== 'meta') {
            return $this->respondSuccess(['ok' => false, 'message' => 'حالة الرقم متاحة لربط Meta فقط']);
        }

        return $this->respondSuccess($onboarding->health($driver, $request->boolean('refresh')));
    }

    public function templates(Request $request): ApiResponse
    {
        $this->authorizeAdmin($request);

        return $this->respondSuccess(
            WhatsAppTemplate::query()->orderByRaw("case when status = 'approved' then 0 else 1 end")->orderBy('name')->get()
                ->map(fn (WhatsAppTemplate $template) => $template->toPayload())->values(),
        );
    }

    public function syncTemplates(Request $request, TemplateSync $sync): ApiResponse
    {
        $this->authorizeAdmin($request);
        $result = $sync->sync();

        return $result['ok']
            ? $this->respondSuccess(['count' => $result['count'] ?? 0], $result['message'])
            : $this->respondError($result['message'], 422);
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

    /**
     * What the inbox needs for the current employee: statuses, tags, counters, and (admins) the team.
     */
    public function inboxMeta(Request $request, WhatsAppSettings $settings): ApiResponse
    {
        $employee = $this->employee($request);
        $isAdmin = $employee->isAdmin();

        $counts = WhatsAppConversation::query()->visibleTo($employee)
            ->selectRaw('status, count(*) as total, sum(case when unread_count > 0 then 1 else 0 end) as unread')
            ->groupBy('status')
            ->get()
            ->keyBy('status');

        return $this->respondSuccess([
            'is_admin' => $isAdmin,
            'phone_hidden' => $this->hidesPhone($employee, $settings),
            'statuses' => collect(WhatsAppConversation::STATUSES)->map(fn (string $label, string $key) => [
                'key' => $key,
                'label' => $label,
                'count' => (int) ($counts[$key]->total ?? 0),
                'unread' => (int) ($counts[$key]->unread ?? 0),
            ])->values(),
            'preset_tags' => array_values((array) $settings->get('inbox.preset_tags', [])),
            'employees' => $isAdmin
                ? Employee::query()->where('is_active', true)->orderBy('name')->get(['id', 'name'])
                : [],
        ]);
    }

    public function conversations(Request $request, WhatsAppSettings $settings): ApiResponse
    {
        $employee = $this->employee($request);
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::in(array_keys(WhatsAppConversation::STATUSES))],
            'tag' => ['nullable', 'string', 'max:30'],
            'assigned_to' => ['nullable', 'regex:/^(\d+|none)$/'],
        ]);

        $hidePhone = $this->hidesPhone($employee, $settings);
        $search = trim((string) ($validated['search'] ?? ''));
        $assignee = $employee->isAdmin() ? ($validated['assigned_to'] ?? null) : null;

        $conversations = WhatsAppConversation::query()
            ->visibleTo($employee)
            ->with(['lead:id,client_name', 'assignee:id,name', 'messages' => fn ($q) => $q->latest('id')->limit(1)])
            ->when($search !== '', fn ($q) => $q->where(function ($q) use ($search, $hidePhone) {
                $q->where('name', 'like', "%{$search}%");
                $digits = preg_replace('/\D/', '', $search);
                if (! $hidePhone && $digits !== '') {
                    $q->orWhere('phone', 'like', '%'.PhoneNumber::normalize($digits).'%');
                }
            }))
            ->when($validated['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->when($validated['tag'] ?? null, fn ($q, $tag) => $q->whereJsonContains('tags', $tag))
            ->when($assignee === 'none', fn ($q) => $q->whereNull('assigned_to'))
            ->when($assignee !== null && $assignee !== 'none', fn ($q) => $q->where('assigned_to', (int) $assignee))
            ->when($request->boolean('unread'), fn ($q) => $q->where('unread_count', '>', 0))
            ->orderByDesc('last_message_at')
            ->paginate(min(50, max(10, $request->integer('per_page', 25))));

        $conversations->getCollection()->transform(fn (WhatsAppConversation $c) => [
            ...$this->conversationPayload($c, $hidePhone),
            'last_message' => $c->messages->first()?->body,
            'last_message_at' => $c->last_message_at?->toIso8601String(),
        ]);

        return $this->respondPaginated($conversations, 'Conversations retrieved');
    }

    public function messages(Request $request, WhatsAppConversation $conversation, WhatsAppSettings $settings): ApiResponse
    {
        $employee = $this->authorizeConversation($request, $conversation);
        $conversation->forceFill(['unread_count' => 0])->save();
        $conversation->load(['lead:id,client_name', 'assignee:id,name']);

        return $this->respondSuccess([
            'conversation' => $this->conversationPayload($conversation, $this->hidesPhone($employee, $settings)),
            'customer' => $this->customerPayload($conversation),
            'notes' => $this->notesPayload($conversation),
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

    /**
     * Change the contact status / tags (assignee or admin) or reassign the conversation (admin only).
     */
    public function update(Request $request, WhatsAppConversation $conversation, WhatsAppSettings $settings): ApiResponse
    {
        $employee = $this->authorizeConversation($request, $conversation);
        $validated = $request->validate([
            'status' => ['sometimes', Rule::in(array_keys(WhatsAppConversation::STATUSES))],
            'tags' => ['sometimes', 'array', 'max:10'],
            'tags.*' => ['string', 'distinct', 'min:1', 'max:30'],
            'assigned_to' => ['sometimes', 'nullable', 'integer', Rule::exists('employees', 'id')->where('is_active', true)],
        ]);

        if (array_key_exists('assigned_to', $validated)) {
            if (! $employee->isAdmin()) {
                abort(403, 'Only an admin can reassign conversations.');
            }
            $validated['assigned_at'] = $validated['assigned_to'] ? now() : null;
        }
        if (isset($validated['tags'])) {
            $validated['tags'] = array_values(array_unique(array_map(fn (string $tag) => trim($tag), $validated['tags'])));
        }

        $conversation->forceFill($validated)->save();
        $conversation->load(['lead:id,client_name', 'assignee:id,name']);

        return $this->respondSuccess(
            $this->conversationPayload($conversation, $this->hidesPhone($employee, $settings)),
            'تم تحديث المحادثة',
        );
    }

    public function reply(Request $request, WhatsAppConversation $conversation, WhatsAppManager $manager, WhatsAppSettings $settings): ApiResponse
    {
        $employee = $this->authorizeConversation($request, $conversation);
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
        $this->authorizeConversation($request, $conversation);
        $conversation->forceFill(['ai_paused_until' => null])->save();

        return $this->respondSuccess(null, 'تم تشغيل الرد التلقائي لهذا العميل');
    }

    /**
     * Internal note on the conversation (or one of its messages). Saved on the customer's CRM lead,
     * which is created when the number has none yet.
     */
    public function storeNote(Request $request, WhatsAppConversation $conversation, LeadLinker $leads): ApiResponse
    {
        $employee = $this->authorizeConversation($request, $conversation);
        $validated = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
            'message_id' => ['nullable', 'integer', Rule::exists('wa_messages', 'id')->where('conversation_id', $conversation->id)],
        ]);

        $lead = $leads->linkConversation($conversation, true, 'من ملاحظة على محادثة واتساب');

        $note = $lead->notes()->create([
            'employee_id' => $employee->id,
            'body' => $validated['body'],
            'source' => 'whatsapp',
            'notable_type' => isset($validated['message_id']) ? WhatsAppMessage::MORPH_ALIAS : WhatsAppConversation::MORPH_ALIAS,
            'notable_id' => $validated['message_id'] ?? $conversation->id,
        ]);

        return $this->respondCreated($note->load('employee:id,name')->toPayload(), 'تمت إضافة الملاحظة');
    }

    public function destroyNote(Request $request, WhatsAppConversation $conversation, LeadNote $note): ApiResponse
    {
        $employee = $this->authorizeConversation($request, $conversation);

        if (! $conversation->lead_id || (int) $note->lead_id !== (int) $conversation->lead_id) {
            abort(404);
        }
        if (! $note->isDeletableBy($employee)) {
            abort(403, 'Only the author or an admin can delete this note.');
        }

        $note->delete();

        return $this->respondDeleted('تم حذف الملاحظة');
    }

    /**
     * Note on a phone number: finds (or creates) the CRM lead for that number and links its conversation.
     */
    public function storeContactNote(Request $request, LeadLinker $leads, WhatsAppSettings $settings): ApiResponse
    {
        $employee = $this->employee($request);
        $validated = $request->validate([
            'phone' => ['required', 'string', 'max:30', 'regex:/^[\d\s+()-]{8,30}$/'],
            'name' => ['nullable', 'string', 'max:120'],
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $phone = PhoneNumber::normalize($validated['phone'], (string) $settings->get('default_country_code', '966'));
        $lead = $leads->find($phone);

        if ($lead) {
            Gate::forUser($employee)->authorize('update', $lead);
        } else {
            Gate::forUser($employee)->authorize('create', Lead::class);
            // Non-admins own the lead they create, so they can keep following it.
            $lead = $leads->findOrCreate($phone, $validated['name'] ?? null, 'من ملاحظة على رقم واتساب', $employee->isAdmin() ? null : $employee->id);
        }

        $conversation = WhatsAppConversation::query()->where('phone', $phone)->first();
        if ($conversation && ! $conversation->lead_id) {
            $conversation->forceFill(['lead_id' => $lead->id])->save();
        }

        $note = $lead->notes()->create([
            'employee_id' => $employee->id,
            'body' => $validated['body'],
            'source' => 'whatsapp',
            'notable_type' => $conversation ? WhatsAppConversation::MORPH_ALIAS : null,
            'notable_id' => $conversation?->id,
        ]);

        return $this->respondCreated([
            'lead_id' => $lead->id,
            'lead_created' => $lead->wasRecentlyCreated,
            'note' => $note->load('employee:id,name')->toPayload(),
        ], $lead->wasRecentlyCreated ? 'تم تسجيل العميل وإضافة الملاحظة' : 'تمت إضافة الملاحظة لملف العميل');
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
            'embedded_signup' => app(MetaOnboarding::class)->clientConfig(),
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

    /**
     * @return array<string, mixed>
     */
    private function conversationPayload(WhatsAppConversation $conversation, bool $hidePhone): array
    {
        return [
            'id' => $conversation->id,
            'phone' => $hidePhone ? PhoneNumber::mask($conversation->phone) : $conversation->phone,
            'phone_hidden' => $hidePhone,
            'name' => $conversation->name ?? $conversation->lead?->client_name,
            'lead_id' => $conversation->lead_id,
            'status' => $conversation->status,
            'tags' => array_values((array) ($conversation->tags ?? [])),
            'assigned_to' => $conversation->assigned_to,
            'assignee_name' => $conversation->assignee?->name,
            'unread_count' => $conversation->unread_count,
            'within_window' => $conversation->isWithinServiceWindow(),
            'ai_paused_until' => $conversation->ai_paused_until?->toIso8601String(),
        ];
    }

    /**
     * The CRM side of the customer shown next to the chat: owner, status and recent finance requests.
     *
     * @return array<string, mixed>|null
     */
    private function customerPayload(WhatsAppConversation $conversation): ?array
    {
        $lead = $conversation->lead_id ? Lead::query()->with(['assignedTo:id,name', 'contactSource:id,name'])->find($conversation->lead_id) : null;

        if (! $lead) {
            return null;
        }

        return [
            'lead_id' => $lead->id,
            'name' => $lead->client_name,
            'status' => $lead->status,
            'status_label' => $lead->status_label,
            'source' => $lead->contactSource?->name,
            'assignee_name' => $lead->assignedTo?->name,
            'created_at' => $lead->created_at?->toIso8601String(),
            'bookings' => $lead->orders()->with('car:id,name')->latest('id')->limit(5)->get()->map(fn (Booking $booking) => [
                'id' => $booking->id,
                'status' => $booking->status,
                'status_label' => $booking->status_label,
                'car_name' => $booking->car?->name,
                'created_at' => $booking->created_at?->toIso8601String(),
            ])->values(),
        ];
    }

    /**
     * All notes on the customer's lead (every channel), newest first.
     *
     * @return list<array<string, mixed>>
     */
    private function notesPayload(WhatsAppConversation $conversation): array
    {
        if (! $conversation->lead_id) {
            return [];
        }

        return LeadNote::query()
            ->where('lead_id', $conversation->lead_id)
            ->with('employee:id,name')
            ->latest('id')
            ->limit(100)
            ->get()
            ->map(fn (LeadNote $note) => $note->toPayload())
            ->values()
            ->all();
    }

    private function hidesPhone(Employee $employee, WhatsAppSettings $settings): bool
    {
        return ! $employee->isAdmin() && (bool) $settings->get('inbox.hide_phone_from_sales', false);
    }

    private function employee(Request $request): Employee
    {
        /** @var Employee|null $employee */
        $employee = $request->user('employee');

        if (! $employee) {
            abort(401);
        }

        return $employee;
    }

    /** Sales only reach the conversations assigned to them (404 hides that others exist). */
    private function authorizeConversation(Request $request, WhatsAppConversation $conversation): Employee
    {
        $employee = $this->employee($request);

        if (! $conversation->isVisibleTo($employee)) {
            abort(404);
        }

        return $employee;
    }

    private function authorizeAdmin(Request $request): Employee
    {
        $employee = $this->employee($request);

        if (! $employee->isAdmin()) {
            abort(403, 'Unauthorized. Admin access required.');
        }

        return $employee;
    }
}
