<?php

declare(strict_types=1);

namespace App\Services\Reports\Sections;

use App\Services\Reports\ReportFilters;
use App\Services\Reports\ReportMetrics;
use App\Services\Reports\ReportSection;

/**
 * The 12 months ending with the selected period (one GROUP BY month per table).
 */
class TrendSection extends ReportSection
{
    public function key(): string
    {
        return 'trend';
    }

    public function label(): string
    {
        return 'الأداء الشهري';
    }

    public function icon(): string
    {
        return 'trending-up';
    }

    public function order(): int
    {
        return 70;
    }

    public function details(ReportFilters $filters): array
    {
        $year = new ReportFilters($filters->to->subMonths(11)->startOfMonth(), $filters->to->endOfDay(), $filters->employeeId, $filters->brandId, $filters->scopedToSelf);

        $bookingMonth = ReportMetrics::month('bookings.created_at');
        $bookings = $year->bookings()->toBase()
            ->selectRaw("{$bookingMonth} as month, ".ReportMetrics::bookingAggregates())
            ->groupByRaw($bookingMonth)
            ->get()
            ->keyBy('month');

        $leadMonth = ReportMetrics::month('leads.created_at');
        $leads = $year->leads()->toBase()
            ->selectRaw("{$leadMonth} as month, count(*) as total")
            ->groupByRaw($leadMonth)
            ->pluck('total', 'month');

        $rows = [];
        for ($cursor = $year->from; $cursor->lte($year->to); $cursor = $cursor->addMonth()) {
            $key = $cursor->format('Y-m');
            $rows[] = ['month' => $cursor->locale('ar')->translatedFormat('F Y'), 'key' => $key, 'leads' => (int) ($leads[$key] ?? 0), ...$this->bookingCells($bookings[$key] ?? null)];
        }

        return [
            'charts' => [
                $this->chart('monthly', 'آخر 12 شهر', 'line', [['key' => 'leads', 'label' => 'عملاء'], ['key' => 'bookings', 'label' => 'طلبات'], ['key' => 'won', 'label' => 'مكسوب']],
                    array_map(fn (array $row) => ['label' => $row['key'], 'values' => ['leads' => $row['leads'], 'bookings' => $row['bookings'], 'won' => $row['won']]], $rows)),
                $this->chart('monthly_commission', 'العمولة الشهرية', 'bar', [['key' => 'commission', 'label' => 'عمولة']],
                    array_map(fn (array $row) => ['label' => $row['key'], 'values' => ['commission' => $row['commission']]], $rows), 'money'),
            ],
            'tables' => [
                $this->table('monthly', 'الأداء الشهري', [
                    ['key' => 'month', 'label' => 'الشهر'],
                    ['key' => 'leads', 'label' => 'العملاء', 'format' => 'number'],
                    ...$this->bookingColumns(),
                ], array_map(fn (array $row) => array_diff_key($row, ['key' => true]), $rows)),
            ],
        ];
    }
}
