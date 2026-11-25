<?php

declare(strict_types=1);

namespace App\Modules\AiAssistant\Reports;

use App\Models\Employee;
use App\Modules\AiAssistant\Models\AssistantConversation;
use App\Modules\AiAssistant\Models\AssistantMessage;
use App\Services\Reports\ReportFilters;
use App\Services\Reports\ReportMetrics;
use App\Services\Reports\ReportSection;

/**
 * AI assistant tab of the reports page (registered only while the module is enabled).
 * Conversations are not owned by a sales rep, so it is part of the full report only.
 */
class AiAssistantReportSection extends ReportSection
{
    public function key(): string
    {
        return 'ai-assistant';
    }

    public function label(): string
    {
        return 'المساعد الذكي';
    }

    public function icon(): string
    {
        return 'bot';
    }

    public function order(): int
    {
        return 90;
    }

    public function visibleTo(Employee $employee, bool $canViewAll): bool
    {
        return $canViewAll;
    }

    public function kpiDefinitions(): array
    {
        return [
            'conversations' => ['label' => 'محادثات', 'format' => 'number'],
            'replies' => ['label' => 'ردود المساعد', 'format' => 'number'],
            'leads' => ['label' => 'عملاء سجّلهم', 'format' => 'number'],
            'lead_rate' => ['label' => 'محادثات اتحولت لعميل', 'format' => 'percent'],
            'avg_latency' => ['label' => 'متوسط زمن الرد', 'format' => 'seconds', 'lower_is_better' => true],
            'flagged' => ['label' => 'ردود اتمنعت/اتعدلت', 'format' => 'number', 'hint' => 'حماية المخرجات (OutputGuard)', 'lower_is_better' => true],
            'tokens' => ['label' => 'التوكنز المستهلكة', 'format' => 'number'],
        ];
    }

    public function kpiValues(ReportFilters $filters): array
    {
        $conversations = AssistantConversation::query()->whereBetween('created_at', $filters->range())->toBase()
            ->selectRaw('count(*) as total, sum(case when lead_id is not null then 1 else 0 end) as leads')
            ->first();

        $messages = AssistantMessage::query()->whereBetween('created_at', $filters->range())->toBase()
            ->selectRaw("sum(case when role = 'model' then 1 else 0 end) as replies,
                avg(case when role = 'model' and latency_ms > 0 then latency_ms end) as latency,
                sum(case when guard_flags is not null then 1 else 0 end) as flagged,
                coalesce(sum(tokens_in), 0) + coalesce(sum(tokens_out), 0) as tokens")
            ->first();

        $total = (int) ($conversations->total ?? 0);

        return [
            'conversations' => $total,
            'replies' => (int) ($messages->replies ?? 0),
            'leads' => (int) ($conversations->leads ?? 0),
            'lead_rate' => ReportMetrics::rate((int) ($conversations->leads ?? 0), $total),
            'avg_latency' => $messages->latency !== null ? round((float) $messages->latency / 1000, 1) : null,
            'flagged' => (int) ($messages->flagged ?? 0),
            'tokens' => (int) ($messages->tokens ?? 0),
        ];
    }

    public function details(ReportFilters $filters): array
    {
        $channels = AssistantConversation::query()->whereBetween('ai_conversations.created_at', $filters->range())->toBase()
            ->leftJoin('leads', 'leads.id', '=', 'ai_conversations.lead_id')
            ->selectRaw("ai_conversations.channel, count(*) as total, coalesce(sum(ai_conversations.messages_count), 0) as messages,
                sum(case when ai_conversations.lead_id is not null then 1 else 0 end) as leads,
                sum(case when leads.status = 'converted' then 1 else 0 end) as converted")
            ->groupBy('ai_conversations.channel')
            ->get();

        $day = ReportMetrics::day('created_at');
        $daily = AssistantMessage::query()->whereBetween('created_at', $filters->range())->where('role', 'model')->toBase()
            ->selectRaw("{$day} as day, count(*) as total")
            ->groupByRaw($day)
            ->orderBy('day')
            ->get();

        $labels = ['storefront' => 'المتجر', 'whatsapp' => 'واتساب'];

        return [
            'charts' => [
                $this->chart('replies_daily', 'ردود المساعد يومياً', 'line', [['key' => 'replies', 'label' => 'ردود']],
                    $daily->map(fn (object $row) => ['label' => (string) $row->day, 'values' => ['replies' => (int) $row->total]])->all()),
            ],
            'tables' => [
                $this->table('channels', 'حسب القناة', [
                    ['key' => 'channel', 'label' => 'القناة'],
                    ['key' => 'conversations', 'label' => 'محادثات', 'format' => 'number'],
                    ['key' => 'messages', 'label' => 'رسائل', 'format' => 'number'],
                    ['key' => 'leads', 'label' => 'عملاء', 'format' => 'number'],
                    ['key' => 'converted', 'label' => 'اتحولوا', 'format' => 'number'],
                    ['key' => 'lead_rate', 'label' => 'نسبة التحويل لعميل', 'format' => 'percent'],
                ], $channels->map(fn (object $row) => [
                    'channel' => $labels[$row->channel] ?? $row->channel,
                    'conversations' => (int) $row->total,
                    'messages' => (int) $row->messages,
                    'leads' => (int) $row->leads,
                    'converted' => (int) $row->converted,
                    'lead_rate' => ReportMetrics::rate((int) $row->leads, (int) $row->total),
                ])->all()),
            ],
        ];
    }
}
