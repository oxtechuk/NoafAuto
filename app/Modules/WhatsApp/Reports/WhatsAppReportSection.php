<?php

declare(strict_types=1);

namespace App\Modules\WhatsApp\Reports;

use App\Models\Employee;
use App\Models\Lead;
use App\Modules\WhatsApp\Models\WhatsAppConversation;
use App\Modules\WhatsApp\Models\WhatsAppMessage;
use App\Modules\WhatsApp\Models\WhatsAppTemplate;
use App\Modules\WhatsApp\Services\InboundProcessor;
use App\Modules\WhatsApp\Services\WhatsAppSettings;
use App\Services\Reports\ReportFilters;
use App\Services\Reports\ReportMetrics;
use App\Services\Reports\ReportSection;
use Illuminate\Database\Eloquent\Builder;

/**
 * WhatsApp tab of the reports page (registered only while the module is enabled).
 * For a sales rep it covers the conversations assigned to them.
 */
class WhatsAppReportSection extends ReportSection
{
    public function key(): string
    {
        return 'whatsapp';
    }

    public function label(): string
    {
        return 'واتساب';
    }

    public function icon(): string
    {
        return 'message-circle';
    }

    public function order(): int
    {
        return 80;
    }

    public function kpiDefinitions(): array
    {
        return [
            'new_conversations' => ['label' => 'محادثات جديدة', 'format' => 'number'],
            'inbound' => ['label' => 'رسائل العملاء', 'format' => 'number'],
            'agent_replies' => ['label' => 'ردود الموظفين', 'format' => 'number'],
            'auto_replies' => ['label' => 'ردود تلقائية / AI', 'format' => 'number'],
            'notifications' => ['label' => 'إشعارات الطلبات والحملات', 'format' => 'number'],
            'delivery_rate' => ['label' => 'نسبة الوصول', 'format' => 'percent'],
            'read_rate' => ['label' => 'نسبة القراءة', 'format' => 'percent'],
            'failed' => ['label' => 'رسائل فشلت', 'format' => 'number', 'lower_is_better' => true],
            'leads' => ['label' => 'عملاء من واتساب', 'format' => 'number'],
            'billable' => ['label' => 'رسائل مدفوعة لـ Meta', 'format' => 'number', 'hint' => 'حسب ما تبلّغ به Meta لكل رسالة؛ ردود خدمة العملاء خلال 24 ساعة مجانية'],
            'estimated_cost' => ['label' => 'التكلفة التقديرية', 'format' => 'money', 'lower_is_better' => true, 'hint' => 'عدد الرسائل المدفوعة × السعر المحفوظ في إعدادات واتساب (القوالب)'],
        ];
    }

    public function kpiValues(ReportFilters $filters): array
    {
        $row = $this->messages($filters)->toBase()->selectRaw("
            sum(case when direction = 'in' then 1 else 0 end) as inbound,
            sum(case when direction = 'out' and event = 'agent_reply' then 1 else 0 end) as agent_replies,
            sum(case when direction = 'out' and event in ('ai_reply', 'auto_reply') then 1 else 0 end) as auto_replies,
            sum(case when direction = 'out' and event in ('booking_created', 'booking_status_updated', 'campaign') then 1 else 0 end) as notifications,
            sum(case when direction = 'out' and status in ('sent', 'delivered', 'read') then 1 else 0 end) as sent,
            sum(case when direction = 'out' and status in ('delivered', 'read') then 1 else 0 end) as delivered,
            sum(case when direction = 'out' and status = 'read' then 1 else 0 end) as seen,
            sum(case when direction = 'out' and status = 'failed' then 1 else 0 end) as failed
        ")->first();

        $sent = (int) ($row->sent ?? 0);
        $billable = $this->billableByCategory($filters);

        return [
            'billable' => array_sum($billable),
            'estimated_cost' => $this->estimatedCost($billable),
            'new_conversations' => $this->conversations($filters)->whereBetween('created_at', $filters->range())->count(),
            'inbound' => (int) ($row->inbound ?? 0),
            'agent_replies' => (int) ($row->agent_replies ?? 0),
            'auto_replies' => (int) ($row->auto_replies ?? 0),
            'notifications' => (int) ($row->notifications ?? 0),
            'delivery_rate' => ReportMetrics::rate((int) ($row->delivered ?? 0), $sent),
            'read_rate' => ReportMetrics::rate((int) ($row->seen ?? 0), $sent),
            'failed' => (int) ($row->failed ?? 0),
            'leads' => Lead::query()
                ->whereBetween('created_at', $filters->range())
                ->where('marketing_channel', InboundProcessor::LEAD_SOURCE)
                ->when($filters->employeeId, fn (Builder $q, int $id) => $q->where('assigned_to', $id))
                ->count(),
        ];
    }

    public function details(ReportFilters $filters): array
    {
        $statuses = $this->conversations($filters)->toBase()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $byAssignee = $this->conversations($filters)->toBase()
            ->selectRaw("assigned_to, count(*) as total,
                sum(case when status = 'open' then 1 else 0 end) as open,
                sum(case when status = 'pending' then 1 else 0 end) as pending,
                sum(case when status = 'closed' then 1 else 0 end) as closed,
                sum(case when unread_count > 0 then 1 else 0 end) as unread")
            ->groupBy('assigned_to')
            ->get()
            ->keyBy(fn (object $row) => (int) $row->assigned_to);

        $replies = $this->messages($filters)->where('event', 'agent_reply')->whereNotNull('sent_by')->toBase()
            ->selectRaw('sent_by, count(*) as total')
            ->groupBy('sent_by')
            ->pluck('total', 'sent_by');

        $ids = collect([...$byAssignee->keys(), ...$replies->keys()])->map(fn ($id) => (int) $id)->unique();
        $names = Employee::query()->whereIn('id', $ids->filter())->pluck('name', 'id');

        $team = $ids->map(fn (int $id) => [
            'name' => $id === 0 ? 'غير موزعة' : ($names[$id] ?? "موظف #{$id}"),
            'conversations' => (int) ($byAssignee[$id]->total ?? 0),
            'open' => (int) ($byAssignee[$id]->open ?? 0),
            'pending' => (int) ($byAssignee[$id]->pending ?? 0),
            'closed' => (int) ($byAssignee[$id]->closed ?? 0),
            'unread' => (int) ($byAssignee[$id]->unread ?? 0),
            'replies' => (int) ($replies[$id] ?? 0),
        ])->sortByDesc('replies')->values()->all();

        // Tags are a short JSON list on conversations that have any; counted per tag.
        $tags = [];
        $this->conversations($filters)->whereNotNull('tags')->toBase()->orderBy('id')->chunk(1000, function ($rows) use (&$tags) {
            foreach ($rows as $row) {
                foreach ((array) json_decode((string) $row->tags, true) as $tag) {
                    $tags[$tag] = ($tags[$tag] ?? 0) + 1;
                }
            }
        });
        arsort($tags);

        $day = ReportMetrics::day('created_at');
        $daily = $this->messages($filters)->toBase()
            ->selectRaw("{$day} as day, sum(case when direction = 'in' then 1 else 0 end) as inbound, sum(case when direction = 'out' then 1 else 0 end) as outbound")
            ->groupByRaw($day)
            ->orderBy('day')
            ->get();

        return [
            'charts' => [
                $this->chart('messages_daily', 'الرسائل يومياً', 'line', [['key' => 'inbound', 'label' => 'واردة'], ['key' => 'outbound', 'label' => 'صادرة']],
                    $daily->map(fn (object $row) => ['label' => (string) $row->day, 'values' => ['inbound' => (int) $row->inbound, 'outbound' => (int) $row->outbound]])->all()),
                $this->chart('conversation_statuses', 'المحادثات حسب الحالة (الآن)', 'bar', [['key' => 'conversations', 'label' => 'محادثات']],
                    collect(WhatsAppConversation::STATUSES)->map(fn (string $label, string $status) => ['label' => $label, 'values' => ['conversations' => (int) ($statuses[$status] ?? 0)]])->values()->all()),
                $this->chart('tags', 'التاجز', 'bar', [['key' => 'conversations', 'label' => 'محادثات']],
                    collect(array_slice($tags, 0, 15, true))->map(fn (int $count, string $tag) => ['label' => $tag, 'values' => ['conversations' => $count]])->values()->all()),
                $this->chart('billable_categories', 'الرسائل المدفوعة حسب تصنيف Meta', 'bar', [['key' => 'messages', 'label' => 'رسائل']],
                    collect($this->billableByCategory($filters))->map(fn (int $count, string $category) => ['label' => WhatsAppTemplate::CATEGORIES[$category] ?? $category, 'values' => ['messages' => $count]])->values()->all()),
            ],
            'tables' => [
                $this->table('team', 'المحادثات لكل موظف', [
                    ['key' => 'name', 'label' => 'الموظف'],
                    ['key' => 'conversations', 'label' => 'محادثات', 'format' => 'number'],
                    ['key' => 'open', 'label' => 'شغال', 'format' => 'number'],
                    ['key' => 'pending', 'label' => 'منتظر', 'format' => 'number'],
                    ['key' => 'closed', 'label' => 'مقفول', 'format' => 'number'],
                    ['key' => 'unread', 'label' => 'غير مقروءة', 'format' => 'number'],
                    ['key' => 'replies', 'label' => 'ردود في الفترة', 'format' => 'number'],
                ], $team, 'الحالات الوضع الحالي، الردود للفترة المختارة'),
            ],
        ];
    }

    /**
     * Messages Meta charged for in the period, per pricing category.
     *
     * @return array<string, int>
     */
    private function billableByCategory(ReportFilters $filters): array
    {
        return $this->messages($filters)->toBase()
            ->where('direction', 'out')
            ->where('billable', true)
            ->selectRaw("coalesce(pricing_category, 'other') as category, count(*) as total")
            ->groupBy('category')
            ->pluck('total', 'category')
            ->map(fn ($total) => (int) $total)
            ->all();
    }

    /**
     * @param  array<string, int>  $billable
     */
    private function estimatedCost(array $billable): float
    {
        $rates = (array) app(WhatsAppSettings::class)->get('pricing.rates', []);

        return round(collect($billable)->sum(fn (int $count, string $category) => $count * (float) ($rates[$category] ?? 0)), 2);
    }

    /**
     * @return Builder<WhatsAppConversation>
     */
    private function conversations(ReportFilters $filters): Builder
    {
        return WhatsAppConversation::query()->when($filters->employeeId, fn (Builder $q, int $id) => $q->where('assigned_to', $id));
    }

    /**
     * @return Builder<WhatsAppMessage>
     */
    private function messages(ReportFilters $filters): Builder
    {
        return WhatsAppMessage::query()
            ->whereBetween('created_at', $filters->range())
            ->when($filters->employeeId, fn (Builder $q, int $id) => $q->whereIn('conversation_id', WhatsAppConversation::query()->select('id')->where('assigned_to', $id)));
    }
}
