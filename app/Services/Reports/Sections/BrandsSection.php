<?php

declare(strict_types=1);

namespace App\Services\Reports\Sections;

use App\Models\Brand;
use App\Models\Car;
use App\Services\Reports\ReportFilters;
use App\Services\Reports\ReportMetrics;
use App\Services\Reports\ReportSection;

class BrandsSection extends ReportSection
{
    public function key(): string
    {
        return 'brands';
    }

    public function label(): string
    {
        return 'البراندات';
    }

    public function icon(): string
    {
        return 'badge-check';
    }

    public function order(): int
    {
        return 40;
    }

    public function kpiDefinitions(): array
    {
        return [
            'brands_requested' => ['label' => 'براندات عليها طلبات', 'format' => 'number'],
            'brands_won' => ['label' => 'براندات فيها مبيعات', 'format' => 'number'],
        ];
    }

    public function kpiValues(ReportFilters $filters): array
    {
        $won = ReportMetrics::isWon();
        $row = $filters->bookings()->toBase()
            ->join('cars', 'cars.id', '=', 'bookings.car_id')
            ->selectRaw("count(distinct cars.brand_id) as brands, count(distinct case when {$won} then cars.brand_id end) as brands_won")
            ->first();

        return [
            'brands_requested' => (int) ($row->brands ?? 0),
            'brands_won' => (int) ($row->brands_won ?? 0),
        ];
    }

    public function details(ReportFilters $filters): array
    {
        $bookings = $filters->bookings()->toBase()
            ->join('cars', 'cars.id', '=', 'bookings.car_id')
            ->selectRaw('cars.brand_id, '.ReportMetrics::bookingAggregates())
            ->groupBy('cars.brand_id')
            ->get()
            ->keyBy('brand_id');

        $leads = $filters->leads()->toBase()
            ->join('cars', 'cars.id', '=', 'leads.car_id')
            ->selectRaw('cars.brand_id, count(*) as total')
            ->groupBy('cars.brand_id')
            ->pluck('total', 'brand_id');

        $catalog = Car::query()->toBase()
            ->where('is_active', true)
            ->when($filters->brandId, fn ($q, int $id) => $q->where('brand_id', $id))
            ->selectRaw('brand_id, count(*) as cars, coalesce(sum(views), 0) as views')
            ->groupBy('brand_id')
            ->get()
            ->keyBy('brand_id');

        $ids = collect([...$bookings->keys(), ...$leads->keys(), ...$catalog->keys()])->map(fn ($id) => (int) $id)->unique();
        $names = Brand::query()->toBase()->whereIn('id', $ids)->pluck('name', 'id');

        $rows = $ids->map(fn (int $id) => [
            'brand_id' => $id,
            'name' => $this->localized($names[$id] ?? null, "براند #{$id}"),
            'cars' => (int) ($catalog[$id]->cars ?? 0),
            'views' => (int) ($catalog[$id]->views ?? 0),
            'leads' => (int) ($leads[$id] ?? 0),
            ...$this->bookingCells($bookings[$id] ?? null),
        ])->sortByDesc(fn (array $row) => [$row['bookings'], $row['won'], $row['views']])->values()->all();

        return [
            'charts' => [
                $this->chart('brands', 'الطلبات والمكسوب لكل براند', 'bar', [['key' => 'bookings', 'label' => 'طلبات'], ['key' => 'won', 'label' => 'مكسوب']],
                    array_map(fn (array $row) => ['label' => $row['name'], 'values' => ['bookings' => $row['bookings'], 'won' => $row['won']]], array_slice(array_filter($rows, fn (array $row) => $row['bookings'] > 0), 0, 12))),
            ],
            'tables' => [
                $this->table('brands', 'أداء البراندات', [
                    ['key' => 'name', 'label' => 'البراند'],
                    ['key' => 'cars', 'label' => 'سيارات معروضة', 'format' => 'number'],
                    ['key' => 'views', 'label' => 'المشاهدات (إجمالي)', 'format' => 'number'],
                    ['key' => 'leads', 'label' => 'العملاء', 'format' => 'number'],
                    ...$this->bookingColumns(),
                ], $rows),
            ],
        ];
    }
}
