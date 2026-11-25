<?php

declare(strict_types=1);

namespace App\Services\Reports\Sections;

use App\Models\Booking;
use App\Services\Reports\ReportFilters;
use App\Services\Reports\ReportMetrics;
use App\Services\Reports\ReportSection;

class OverviewSection extends ReportSection
{
    public function key(): string
    {
        return 'overview';
    }

    public function label(): string
    {
        return 'نظرة عامة';
    }

    public function icon(): string
    {
        return 'layout-dashboard';
    }

    public function order(): int
    {
        return 10;
    }

    public function kpiDefinitions(): array
    {
        return [
            'leads' => ['label' => 'العملاء المحتملين', 'format' => 'number'],
            'bookings' => ['label' => 'الطلبات', 'format' => 'number'],
            'won' => ['label' => 'مكسوب (تم التسليم)', 'format' => 'number'],
            'lost' => ['label' => 'خسران', 'format' => 'number', 'lower_is_better' => true],
            'win_rate' => ['label' => 'نسبة الإغلاق', 'format' => 'percent', 'hint' => 'مكسوب ÷ (مكسوب + خسران)'],
            'conversion_rate' => ['label' => 'نسبة التحويل', 'format' => 'percent', 'hint' => 'مكسوب ÷ كل الطلبات'],
            'commission' => ['label' => 'صافي العمولة', 'format' => 'money'],
            'avg_close_days' => ['label' => 'متوسط مدة الإغلاق', 'format' => 'days', 'hint' => 'من إنشاء الطلب حتى التسليم', 'lower_is_better' => true],
        ];
    }

    public function kpiValues(ReportFilters $filters): array
    {
        $won = ReportMetrics::isWon();
        $days = ReportMetrics::daysBetween('bookings.created_at', 'bookings.delivered_at');

        $row = $filters->bookings()->toBase()
            ->selectRaw(ReportMetrics::bookingAggregates().", avg(case when {$won} and bookings.delivered_at is not null then {$days} end) as close_days")
            ->first();

        $total = (int) ($row->total ?? 0);
        $wonCount = (int) ($row->won ?? 0);
        $lost = (int) ($row->lost ?? 0);

        return [
            'leads' => $filters->leads()->count(),
            'bookings' => $total,
            'won' => $wonCount,
            'lost' => $lost,
            'win_rate' => ReportMetrics::winRate($wonCount, $lost),
            'conversion_rate' => ReportMetrics::rate($wonCount, $total),
            'commission' => round((float) ($row->commission ?? 0), 2),
            'avg_close_days' => $row->close_days !== null ? round(max(0, (float) $row->close_days), 1) : null,
        ];
    }

    public function details(ReportFilters $filters): array
    {
        $byStatus = $filters->bookings()->toBase()
            ->selectRaw('bookings.status, count(*) as total')
            ->groupBy('bookings.status')
            ->pluck('total', 'status')
            ->map(fn ($total) => (int) $total)
            ->all();

        $lostStatuses = ReportMetrics::lostStatuses();
        $pipeline = [];
        $lostReasons = [];
        foreach (Booking::STATUSES + array_fill_keys(array_keys($byStatus), []) as $status => $meta) {
            $count = $byStatus[$status] ?? 0;
            if ($count === 0) {
                continue;
            }
            $point = ['label' => $meta['label'] ?? $status, 'values' => ['bookings' => $count]];
            if (in_array($status, $lostStatuses, true)) {
                $lostReasons[] = $point;
            } else {
                $pipeline[] = $point;
            }
        }
        usort($lostReasons, fn (array $a, array $b) => $b['values']['bookings'] <=> $a['values']['bookings']);

        return [
            'charts' => [
                $this->timeline($filters),
                $this->chart('pipeline', 'الطلبات حسب المرحلة الحالية', 'bar', [['key' => 'bookings', 'label' => 'طلبات']], $pipeline),
                $this->chart('lost_reasons', 'أسباب الخسارة', 'bar', [['key' => 'bookings', 'label' => 'طلبات']], $lostReasons),
            ],
        ];
    }

    /**
     * Bookings / won per day (up to ~3 months), per month for longer periods.
     *
     * @return array<string, mixed>
     */
    private function timeline(ReportFilters $filters): array
    {
        $byMonth = $filters->days() > 92;
        $bucket = $byMonth ? ReportMetrics::month('bookings.created_at') : ReportMetrics::day('bookings.created_at');
        $won = ReportMetrics::isWon();

        $rows = $filters->bookings()->toBase()
            ->selectRaw("{$bucket} as bucket, count(*) as total, sum(case when {$won} then 1 else 0 end) as won")
            ->groupByRaw($bucket)
            ->orderBy('bucket')
            ->get()
            ->keyBy('bucket');

        $points = [];
        $cursor = $byMonth ? $filters->from->startOfMonth() : $filters->from->startOfDay();
        while ($cursor->lte($filters->to)) {
            $label = $cursor->format($byMonth ? 'Y-m' : 'Y-m-d');
            $points[] = ['label' => $label, 'values' => ['bookings' => (int) ($rows[$label]->total ?? 0), 'won' => (int) ($rows[$label]->won ?? 0)]];
            $cursor = $byMonth ? $cursor->addMonth() : $cursor->addDay();
        }

        return $this->chart('timeline', $byMonth ? 'الطلبات شهرياً' : 'الطلبات يومياً', 'line', [
            ['key' => 'bookings', 'label' => 'طلبات'],
            ['key' => 'won', 'label' => 'مكسوب'],
        ], $points);
    }
}
