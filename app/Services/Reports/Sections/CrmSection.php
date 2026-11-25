<?php

declare(strict_types=1);

namespace App\Services\Reports\Sections;

use App\Models\Booking;
use App\Models\CalculatorLead;
use App\Models\Lead;
use App\Models\Task;
use App\Services\Reports\ReportFilters;
use App\Services\Reports\ReportMetrics;
use App\Services\Reports\ReportSection;
use Illuminate\Database\Eloquent\Builder;

class CrmSection extends ReportSection
{
    public function key(): string
    {
        return 'crm';
    }

    public function label(): string
    {
        return 'العملاء والـ CRM';
    }

    public function icon(): string
    {
        return 'contact';
    }

    public function order(): int
    {
        return 60;
    }

    public function kpiDefinitions(): array
    {
        return [
            'leads' => ['label' => 'عملاء جدد', 'format' => 'number'],
            'leads_converted' => ['label' => 'عملاء اتحولوا', 'format' => 'number'],
            'calculator_leads' => ['label' => 'طلبات الحاسبة', 'format' => 'number'],
            'tasks_created' => ['label' => 'مهام اتعملت', 'format' => 'number'],
            'tasks_done_rate' => ['label' => 'إنجاز المهام', 'format' => 'percent'],
        ];
    }

    public function kpiValues(ReportFilters $filters): array
    {
        $leads = $filters->leads()->toBase()
            ->selectRaw("count(*) as total, sum(case when leads.status = 'converted' then 1 else 0 end) as converted")
            ->first();

        $tasks = $this->tasks($filters)->toBase()
            ->selectRaw("count(*) as total, sum(case when status = 'done' then 1 else 0 end) as done")
            ->first();

        return [
            'leads' => (int) ($leads->total ?? 0),
            'leads_converted' => (int) ($leads->converted ?? 0),
            // Calculator requests have no assignee: only shown in the full report.
            'calculator_leads' => $filters->scopedToSelf ? null : CalculatorLead::query()->whereBetween('created_at', $filters->range())->count(),
            'tasks_created' => (int) ($tasks->total ?? 0),
            'tasks_done_rate' => ReportMetrics::rate((int) ($tasks->done ?? 0), (int) ($tasks->total ?? 0)),
        ];
    }

    public function details(ReportFilters $filters): array
    {
        $leadStatuses = $filters->leads()->toBase()
            ->selectRaw('leads.status, count(*) as total')
            ->groupBy('leads.status')
            ->pluck('total', 'status');

        $sources = $filters->leads()->toBase()
            ->leftJoin('contact_sources', 'contact_sources.id', '=', 'leads.contact_source_id')
            ->selectRaw("coalesce(contact_sources.name, 'بدون مصدر') as source, count(*) as total, sum(case when leads.status = 'converted' then 1 else 0 end) as converted")
            ->groupBy('contact_sources.name')
            ->orderByDesc('total')
            ->get();

        $types = $filters->bookings()->toBase()
            ->selectRaw('bookings.booking_type, '.ReportMetrics::bookingAggregates())
            ->groupBy('bookings.booking_type')
            ->get();

        $banks = $filters->bookings()->whereNotNull('bookings.calculator_bank_id')->toBase()
            ->leftJoin('calculator_banks', 'calculator_banks.id', '=', 'bookings.calculator_bank_id')
            ->selectRaw('calculator_banks.name as bank, '.ReportMetrics::bookingAggregates())
            ->groupBy('calculator_banks.name')
            ->orderByDesc('total')
            ->get();

        return [
            'charts' => [
                $this->chart('lead_statuses', 'العملاء حسب الحالة', 'bar', [['key' => 'leads', 'label' => 'عملاء']],
                    collect(Lead::STATUSES)->map(fn (array $meta, string $status) => ['label' => $meta['label'], 'values' => ['leads' => (int) ($leadStatuses[$status] ?? 0)]])->values()->all()),
            ],
            'tables' => [
                $this->table('sources', 'مصادر التواصل', [
                    ['key' => 'source', 'label' => 'المصدر'],
                    ['key' => 'leads', 'label' => 'العملاء', 'format' => 'number'],
                    ['key' => 'converted', 'label' => 'اتحولوا', 'format' => 'number'],
                    ['key' => 'conversion', 'label' => 'نسبة التحويل', 'format' => 'percent'],
                ], $sources->map(fn (object $row) => [
                    'source' => $this->localized($row->source, 'بدون مصدر'),
                    'leads' => (int) $row->total,
                    'converted' => (int) $row->converted,
                    'conversion' => ReportMetrics::rate((int) $row->converted, (int) $row->total),
                ])->all()),
                $this->table('booking_types', 'نوع الطلب', [
                    ['key' => 'type', 'label' => 'النوع'],
                    ...$this->bookingColumns(),
                ], $types->map(fn (object $row) => [
                    'type' => Booking::BOOKING_TYPES_LABELS[$row->booking_type] ?? ($row->booking_type ?: 'غير محدد'),
                    ...$this->bookingCells($row),
                ])->all()),
                $this->table('banks', 'البنوك (طلبات الحاسبة)', [
                    ['key' => 'bank', 'label' => 'البنك'],
                    ...$this->bookingColumns(),
                ], $banks->map(fn (object $row) => ['bank' => $this->localized($row->bank, 'غير محدد'), ...$this->bookingCells($row)])->all()),
            ],
        ];
    }

    /**
     * @return Builder<Task>
     */
    private function tasks(ReportFilters $filters): Builder
    {
        return Task::query()
            ->whereBetween('created_at', $filters->range())
            ->when($filters->employeeId, fn (Builder $q, int $id) => $q->where('assigned_to', $id));
    }
}
