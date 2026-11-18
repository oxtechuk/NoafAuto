<?php

namespace App\Services\Bookings;

use App\Models\Booking;
use App\Models\Employee;
use Illuminate\Database\Eloquent\Builder;

/**
 * Listing filters for bookings, mirroring the CRM's four booking lists.
 */
class BookingFilterService
{
    public const ACTIVE_STATUSES = ['new', 'contacted_no_answer', 'recontact_client', 'waiting_documents', 'bank_review', 'approved', 'authorized'];

    public const GROUPS = ['active', 'pending', 'delivered', 'closed', 'awaiting_approval'];

    /**
     * @param  Builder<Booking>  $query
     * @param  array<string, mixed>  $filters
     * @return Builder<Booking>
     */
    public function apply(Builder $query, array $filters, Employee $viewer): Builder
    {
        if (! $viewer->isAdmin()) {
            $query->where('assigned_to', $viewer->id);
        } elseif ($this->filled($filters, 'employee_id')) {
            $query->where('assigned_to', $filters['employee_id']);
        }

        match ($filters['group'] ?? null) {
            'active' => $query->whereIn('status', self::ACTIVE_STATUSES),
            'pending' => $query->where('status', 'pending'),
            'delivered' => $query->where('status', 'received'),
            'closed' => $query->whereIn('status', $this->closedStatuses()),
            'awaiting_approval' => $query->where('status', BookingWorkflowService::AWAITING_APPROVAL),
            default => null,
        };

        if ($this->filled($filters, 'status')) {
            $query->where('status', $filters['status']);
        }

        $this->filterBySource($query, $filters['source'] ?? null);

        if ($this->filled($filters, 'search')) {
            $search = trim((string) $filters['search']);
            $query->where(fn (Builder $q) => $q->where('client_name', 'like', "%{$search}%")->orWhere('client_phone', 'like', "%{$search}%"));
        }

        ($filters['sort'] ?? 'newest') === 'oldest' ? $query->oldest() : $query->latest();

        return $query;
    }

    /**
     * @return array<int, string>
     */
    public function closedStatuses(): array
    {
        return collect(Booking::STATUSES)
            ->filter(fn (array $status): bool => ($status['is_lost'] ?? false) === true || ($status['group'] ?? '') === 'lost')
            ->keys()
            ->all();
    }

    /**
     * @param  Builder<Booking>  $query
     */
    private function filterBySource(Builder $query, mixed $source): void
    {
        match ($source) {
            'calculator' => $query->where(fn (Builder $q) => $q->where('source', 'calculator')
                ->orWhere(fn (Builder $sub) => $sub->whereNull('source')->whereNotNull('calculator_bank_id'))),
            'cars', 'booking' => $query->where(fn (Builder $q) => $q->where('source', '!=', 'calculator')->orWhereNull('source')),
            'test_drive', 'purchase' => $query->where('booking_type', $source),
            'crm_manual' => $query->where('source', 'like', '%CRM%'),
            default => null,
        };
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function filled(array $filters, string $key): bool
    {
        $value = $filters[$key] ?? null;

        return ! is_null($value) && ! (is_string($value) && trim($value) === '');
    }
}
