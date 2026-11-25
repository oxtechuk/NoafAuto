<?php

declare(strict_types=1);

namespace App\Services\Reports\Sections;

use App\Models\Car;
use App\Services\Reports\ReportFilters;
use App\Services\Reports\ReportMetrics;
use App\Services\Reports\ReportSection;
use Illuminate\Support\Collection;

class CarsSection extends ReportSection
{
    private const LIMIT = 100;

    public function key(): string
    {
        return 'cars';
    }

    public function label(): string
    {
        return 'السيارات';
    }

    public function icon(): string
    {
        return 'car';
    }

    public function order(): int
    {
        return 30;
    }

    public function kpiDefinitions(): array
    {
        return [
            'cars_requested' => ['label' => 'سيارات عليها طلبات', 'format' => 'number'],
            'cars_won' => ['label' => 'سيارات اتباعت', 'format' => 'number'],
            'avg_deal_commission' => ['label' => 'متوسط العمولة للصفقة', 'format' => 'money'],
        ];
    }

    public function kpiValues(ReportFilters $filters): array
    {
        $won = ReportMetrics::isWon();
        $row = $filters->bookings()->whereNotNull('bookings.car_id')->toBase()
            ->selectRaw("count(distinct bookings.car_id) as cars, count(distinct case when {$won} then bookings.car_id end) as cars_won, avg(case when {$won} then bookings.net_commission end) as avg_commission")
            ->first();

        return [
            'cars_requested' => (int) ($row->cars ?? 0),
            'cars_won' => (int) ($row->cars_won ?? 0),
            'avg_deal_commission' => $row->avg_commission !== null ? round((float) $row->avg_commission, 2) : null,
        ];
    }

    public function details(ReportFilters $filters): array
    {
        $bookings = $filters->bookings()->whereNotNull('bookings.car_id')->toBase()
            ->selectRaw('bookings.car_id, '.ReportMetrics::bookingAggregates())
            ->groupBy('bookings.car_id')
            ->orderByDesc('total')
            ->limit(self::LIMIT)
            ->get()
            ->keyBy('car_id');

        $leads = $filters->leads()->whereNotNull('leads.car_id')->whereIn('leads.car_id', $bookings->keys())->toBase()
            ->selectRaw('leads.car_id, count(*) as total')
            ->groupBy('leads.car_id')
            ->pluck('total', 'car_id');

        $cars = $this->cars($bookings->keys());

        $rows = $bookings->map(function (object $row, int|string $carId) use ($cars, $leads) {
            $car = $cars[$carId] ?? null;
            $cells = $this->bookingCells($row);

            return [
                'car_id' => (int) $carId,
                'name' => $this->localized($car?->name, "سيارة #{$carId}"),
                'brand' => $this->localized($car?->brand_name, '—'),
                'views' => (int) ($car->views ?? 0),
                'leads' => (int) ($leads[$carId] ?? 0),
                ...$cells,
                'view_to_booking' => ReportMetrics::rate($cells['bookings'], (int) ($car->views ?? 0)),
            ];
        })->values()->all();

        return [
            'charts' => [
                $this->chart('top_cars', 'الأكثر طلباً', 'bar', [['key' => 'bookings', 'label' => 'طلبات'], ['key' => 'won', 'label' => 'مكسوب']],
                    array_map(fn (array $row) => ['label' => $row['name'], 'values' => ['bookings' => $row['bookings'], 'won' => $row['won']]], array_slice($rows, 0, 10))),
            ],
            'tables' => [
                $this->table('cars', 'أداء السيارات', [
                    ['key' => 'name', 'label' => 'السيارة'],
                    ['key' => 'brand', 'label' => 'البراند'],
                    ['key' => 'views', 'label' => 'المشاهدات (إجمالي)', 'format' => 'number'],
                    ['key' => 'leads', 'label' => 'العملاء', 'format' => 'number'],
                    ...$this->bookingColumns(),
                    ['key' => 'view_to_booking', 'label' => 'تحويل المشاهدة لطلب', 'format' => 'percent'],
                ], $rows, 'أعلى '.self::LIMIT.' سيارة طلباً في الفترة'),
                $this->table('opportunities', 'مشاهدات كتير وطلبات قليلة', [
                    ['key' => 'name', 'label' => 'السيارة'],
                    ['key' => 'brand', 'label' => 'البراند'],
                    ['key' => 'views', 'label' => 'المشاهدات (إجمالي)', 'format' => 'number'],
                    ['key' => 'bookings', 'label' => 'طلبات الفترة', 'format' => 'number'],
                ], $this->opportunities($filters), 'راجع السعر أو الصور أو العرض لهذه السيارات'),
            ],
        ];
    }

    /**
     * Most viewed active cars that got (almost) no bookings in the period.
     *
     * @return list<array<string, mixed>>
     */
    private function opportunities(ReportFilters $filters): array
    {
        $popular = Car::query()->toBase()
            ->leftJoin('brands', 'brands.id', '=', 'cars.brand_id')
            ->where('cars.is_active', true)
            ->where('cars.views', '>', 0)
            ->when($filters->brandId, fn ($q, int $id) => $q->where('cars.brand_id', $id))
            ->orderByDesc('cars.views')
            ->limit(40)
            ->get(['cars.id', 'cars.name', 'cars.views', 'brands.name as brand_name']);

        $booked = $filters->bookings()->whereIn('bookings.car_id', $popular->pluck('id'))->toBase()
            ->selectRaw('bookings.car_id, count(*) as total')
            ->groupBy('bookings.car_id')
            ->pluck('total', 'car_id');

        return $popular
            ->map(fn (object $car) => [
                'car_id' => (int) $car->id,
                'name' => $this->localized($car->name, "سيارة #{$car->id}"),
                'brand' => $this->localized($car->brand_name, '—'),
                'views' => (int) $car->views,
                'bookings' => (int) ($booked[$car->id] ?? 0),
            ])
            ->filter(fn (array $row) => $row['bookings'] <= 1)
            ->take(10)
            ->values()
            ->all();
    }

    /**
     * @param  Collection<int|string, mixed>  $ids
     * @return Collection<int|string, object>
     */
    private function cars(Collection $ids): Collection
    {
        if ($ids->isEmpty()) {
            return collect();
        }

        return Car::query()->toBase()
            ->leftJoin('brands', 'brands.id', '=', 'cars.brand_id')
            ->whereIn('cars.id', $ids)
            ->get(['cars.id', 'cars.name', 'cars.views', 'brands.name as brand_name'])
            ->keyBy('id');
    }
}
