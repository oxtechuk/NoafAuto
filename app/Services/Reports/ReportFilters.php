<?php

declare(strict_types=1);

namespace App\Services\Reports;

use App\Models\Booking;
use App\Models\Car;
use App\Models\Lead;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;

/**
 * Period + filters shared by every report section. Date ranges are applied with
 * whereBetween on the raw column (not whereDate) so the created_at indexes are used.
 */
final class ReportFilters
{
    public function __construct(
        public readonly CarbonImmutable $from,
        public readonly CarbonImmutable $to,
        public readonly ?int $employeeId = null,
        public readonly ?int $brandId = null,
        public readonly bool $scopedToSelf = false,
    ) {}

    /** The same-length period right before this one (for comparisons). */
    public function previous(): self
    {
        $days = (int) $this->from->diffInDays($this->to) + 1;

        return new self(
            $this->from->subDays($days)->startOfDay(),
            $this->from->subDay()->endOfDay(),
            $this->employeeId,
            $this->brandId,
            $this->scopedToSelf,
        );
    }

    public function days(): int
    {
        return (int) $this->from->diffInDays($this->to) + 1;
    }

    public function cacheKey(): string
    {
        return implode(':', [
            $this->from->format('Ymd'),
            $this->to->format('Ymd'),
            $this->employeeId ?? '-',
            $this->brandId ?? '-',
        ]);
    }

    /**
     * @return Builder<Booking>
     */
    public function bookings(): Builder
    {
        return $this->applyBookingScope(Booking::query()->whereBetween('bookings.created_at', $this->range()));
    }

    /**
     * Booking filters without the date range (for "current state" numbers such as overdue follow-ups).
     *
     * @return Builder<Booking>
     */
    public function bookingsNow(): Builder
    {
        return $this->applyBookingScope(Booking::query());
    }

    /**
     * @return Builder<Lead>
     */
    public function leads(): Builder
    {
        return Lead::query()
            ->whereBetween('leads.created_at', $this->range())
            ->when($this->employeeId, fn (Builder $q, int $id) => $q->where('leads.assigned_to', $id))
            ->when($this->brandId, fn (Builder $q, int $id) => $q->whereIn('leads.car_id', Car::query()->select('id')->where('brand_id', $id)));
    }

    /**
     * @return array{0: string, 1: string}
     */
    public function range(): array
    {
        return [$this->from->toDateTimeString(), $this->to->toDateTimeString()];
    }

    /**
     * @param  Builder<Booking>  $query
     * @return Builder<Booking>
     */
    private function applyBookingScope(Builder $query): Builder
    {
        return $query
            ->when($this->employeeId, fn (Builder $q, int $id) => $q->where('bookings.assigned_to', $id))
            ->when($this->brandId, fn (Builder $q, int $id) => $q->whereIn('bookings.car_id', Car::query()->select('id')->where('brand_id', $id)));
    }
}
