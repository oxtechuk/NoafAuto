<?php

declare(strict_types=1);

namespace App\Services\Reports;

use Illuminate\Support\Facades\Cache;

/**
 * Builds a section's payload (KPIs with the previous-period comparison, charts, tables)
 * and caches it for a few minutes per section + filters, so opening the page or
 * switching tabs back and forth doesn't repeat the aggregate queries.
 */
class ReportService
{
    public const CACHE_SECONDS = 600;

    private const CACHE_VERSION = 'v1';

    /**
     * @return array<string, mixed>
     */
    public function run(ReportSection $section, ReportFilters $filters, bool $compare = true, bool $fresh = false): array
    {
        $key = implode(':', ['reports', self::CACHE_VERSION, $section->key(), $compare ? 'c' : 'n', $filters->cacheKey()]);

        if ($fresh) {
            Cache::forget($key);
        }

        return Cache::remember($key, self::CACHE_SECONDS, fn () => $this->build($section, $filters, $compare));
    }

    /**
     * @return array<string, mixed>
     */
    private function build(ReportSection $section, ReportFilters $filters, bool $compare): array
    {
        $definitions = $section->kpiDefinitions();
        $current = $definitions !== [] ? $section->kpiValues($filters) : [];
        $previousFilters = $compare && $definitions !== [] ? $filters->previous() : null;
        $previous = $previousFilters ? $section->kpiValues($previousFilters) : [];

        $kpis = [];
        foreach ($definitions as $key => $definition) {
            $value = $current[$key] ?? null;
            $before = $previousFilters ? ($previous[$key] ?? null) : null;

            $kpis[] = [
                'key' => $key,
                'label' => $definition['label'],
                'format' => $definition['format'],
                'hint' => $definition['hint'] ?? null,
                'lower_is_better' => $definition['lower_is_better'] ?? false,
                'value' => $value,
                'previous' => $before,
                'change' => $this->change($value, $before, $definition['format']),
            ];
        }

        $details = $section->details($filters);

        return [
            'section' => $section->key(),
            'label' => $section->label(),
            'range' => [
                'from' => $filters->from->toDateString(),
                'to' => $filters->to->toDateString(),
                'previous_from' => $previousFilters?->from->toDateString(),
                'previous_to' => $previousFilters?->to->toDateString(),
            ],
            'kpis' => $kpis,
            'charts' => $details['charts'] ?? [],
            'tables' => $details['tables'] ?? [],
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /** % change, or percentage-point difference for rates. */
    private function change(int|float|null $value, int|float|null $before, string $format): ?float
    {
        if ($value === null || $before === null) {
            return null;
        }
        if ($format === 'percent') {
            return round($value - $before, 1);
        }

        return $before != 0 ? round(($value - $before) / abs($before) * 100, 1) : null;
    }
}
