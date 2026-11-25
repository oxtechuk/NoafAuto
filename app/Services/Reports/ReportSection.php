<?php

declare(strict_types=1);

namespace App\Services\Reports;

use App\Models\Employee;

/**
 * A tab of the reports page. Sections return plain data (KPIs, charts, tables)
 * that the admin renders generically, so a module can add its own section
 * without any frontend code: register it in ReportRegistry from its provider.
 *
 * Every query must aggregate in SQL (conditional sums + GROUP BY); never load rows to count them in PHP.
 */
abstract class ReportSection
{
    abstract public function key(): string;

    abstract public function label(): string;

    /** lucide icon name used by the admin tab. */
    public function icon(): string
    {
        return 'bar-chart-3';
    }

    public function order(): int
    {
        return 100;
    }

    /**
     * @param  bool  $canViewAll  admin or "manage-reports"; otherwise the viewer only sees their own numbers
     */
    public function visibleTo(Employee $employee, bool $canViewAll): bool
    {
        return true;
    }

    /**
     * KPI cards: key => [label, format (number|money|percent|days|seconds), hint?, lower_is_better?].
     *
     * @return array<string, array{label: string, format: string, hint?: string, lower_is_better?: bool}>
     */
    public function kpiDefinitions(): array
    {
        return [];
    }

    /**
     * KPI values for a period (computed again for the previous period when comparing, so keep it cheap).
     *
     * @return array<string, int|float|null>
     */
    public function kpiValues(ReportFilters $filters): array
    {
        return [];
    }

    /**
     * @return array{charts?: list<array<string, mixed>>, tables?: list<array<string, mixed>>}
     */
    abstract public function details(ReportFilters $filters): array;

    /**
     * @param  list<array{key: string, label: string}>  $series
     * @param  list<array{label: string, values: array<string, int|float|null>}>  $points
     * @return array<string, mixed>
     */
    protected function chart(string $key, string $title, string $type, array $series, array $points, string $format = 'number'): array
    {
        return compact('key', 'title', 'type', 'series', 'points', 'format');
    }

    /**
     * @param  list<array{key: string, label: string, format?: string}>  $columns
     * @param  list<array<string, mixed>>  $rows
     * @return array<string, mixed>
     */
    protected function table(string $key, string $title, array $columns, array $rows, ?string $subtitle = null): array
    {
        return [
            'key' => $key,
            'title' => $title,
            'subtitle' => $subtitle,
            'columns' => array_map(fn (array $column) => $column + ['format' => 'text'], $columns),
            'rows' => $rows,
        ];
    }

    /**
     * The usual booking columns of a breakdown table.
     *
     * @return list<array{key: string, label: string, format: string}>
     */
    protected function bookingColumns(): array
    {
        return [
            ['key' => 'bookings', 'label' => 'الطلبات', 'format' => 'number'],
            ['key' => 'won', 'label' => 'مكسوب', 'format' => 'number'],
            ['key' => 'lost', 'label' => 'خسران', 'format' => 'number'],
            ['key' => 'win_rate', 'label' => 'نسبة الإغلاق', 'format' => 'percent'],
            ['key' => 'commission', 'label' => 'العمولة', 'format' => 'money'],
        ];
    }

    /**
     * @return array{bookings: int, won: int, lost: int, win_rate: ?float, commission: float}
     */
    protected function bookingCells(?object $row): array
    {
        $won = (int) ($row->won ?? 0);
        $lost = (int) ($row->lost ?? 0);

        return [
            'bookings' => (int) ($row->total ?? 0),
            'won' => $won,
            'lost' => $lost,
            'win_rate' => ReportMetrics::winRate($won, $lost),
            'commission' => round((float) ($row->commission ?? 0), 2),
        ];
    }

    /** Arabic first, for translatable JSON names (Car, Brand). */
    protected function localized(mixed $value, string $fallback = ''): string
    {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            $value = is_array($decoded) ? $decoded : $value;
        }
        if (is_array($value)) {
            return (string) ($value['ar'] ?? $value['en'] ?? reset($value) ?: $fallback);
        }

        return $value !== null && $value !== '' ? (string) $value : $fallback;
    }
}
