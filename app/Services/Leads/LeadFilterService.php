<?php

namespace App\Services\Leads;

use App\Models\Employee;
use App\Models\Lead;
use Illuminate\Database\Eloquent\Builder;

class LeadFilterService
{
    public const ACTIVE_BOOKING_STATUSES = [
        'new', 'contacted_no_answer', 'recontact_client', 'waiting_documents',
        'bank_review', 'approved', 'authorized', 'pending', 'waiting_supervisor_approval',
    ];

    public const RECEIVED_BOOKING_STATUSES = [
        'received', 'sold', 'done',
    ];

    public const CLOSED_BOOKING_STATUSES = [
        'lost_no_answer', 'lost_no_response', 'lost_wrong_info', 'lost_offer_not_suitable',
        'lost_client_cancelled', 'lost_cancelled_after_approval', 'lost_rejected_high_liabilities',
        'lost_rejected_simah', 'lost_rejected_finance_terms', 'rejected', 'lost',
    ];

    /**
     * Scope a lead query to what the viewer may see, then apply the listing filters.
     *
     * @param  Builder<Lead>  $query
     * @param  array<string, mixed>  $filters
     * @return Builder<Lead>
     */
    public function apply(Builder $query, array $filters, Employee $viewer): Builder
    {
        $this->scopeToViewer($query, $filters, $viewer);
        $this->filterByPeriod($query, $filters);
        $this->filterBySource($query, $filters);
        $this->filterByStatus($query, $filters);
        $this->filterByBookingStatusGroup($query, $filters);
        $this->filterBySearch($query, $filters);

        if ($this->filled($filters, 'contact_source_id')) {
            $query->where('contact_source_id', $filters['contact_source_id']);
        }

        if ($this->filled($filters, 'booking_status')) {
            $query->whereHas('orders', fn (Builder $q) => $q->where('status', $filters['booking_status']));
        }

        ($filters['sort'] ?? 'newest') === 'oldest' ? $query->oldest() : $query->latest();

        return $query;
    }

    /**
     * Non-admin employees only ever see the leads assigned to them.
     *
     * @param  Builder<Lead>  $query
     * @param  array<string, mixed>  $filters
     */
    private function scopeToViewer(Builder $query, array $filters, Employee $viewer): void
    {
        if (! $viewer->isAdmin()) {
            $query->where('assigned_to', $viewer->id);
        } elseif ($this->filled($filters, 'employee_id')) {
            $query->where('assigned_to', $filters['employee_id']);
        }
    }

    /**
     * @param  Builder<Lead>  $query
     * @param  array<string, mixed>  $filters
     */
    private function filterByPeriod(Builder $query, array $filters): void
    {
        if ($this->filled($filters, 'month')) {
            $parts = explode('-', (string) $filters['month']);

            if (count($parts) === 2) {
                $query->whereYear('created_at', $parts[0])->whereMonth('created_at', $parts[1]);
            }
        } elseif ($this->filled($filters, 'date')) {
            $query->whereDate('created_at', $filters['date']);
        }
    }

    /**
     * @param  Builder<Lead>  $query
     * @param  array<string, mixed>  $filters
     */
    private function filterBySource(Builder $query, array $filters): void
    {
        $source = $filters['source'] ?? null;

        if ($source === 'calculator') {
            $query->where(function (Builder $q) {
                $q->whereHas('orders', function (Builder $oq) {
                    $oq->where('source', 'calculator')->orWhereNotNull('calculator_bank_id');
                })->orWhereHas('contactSource', function (Builder $sq) {
                    $sq->where('name', 'like', '%حاسبة%')->orWhere('name', 'like', '%calculator%');
                });
            });
        } elseif ($source === 'cars' || $source === 'booking') {
            $query->where(function (Builder $q) {
                $q->whereHas('orders', function (Builder $oq) {
                    $oq->where('source', '!=', 'calculator')->orWhereNull('source');
                })->orWhereNotNull('car_id');
            });
        } elseif ($source === 'crm_manual') {
            $query->where(function (Builder $q) {
                $q->where('subject', 'like', '%CRM%')
                    ->orWhereHas('orders', fn (Builder $oq) => $oq->where('source', 'like', '%CRM%'));
            });
        }
    }

    /**
     * Match either the lead status or the status of one of its bookings.
     *
     * @param  Builder<Lead>  $query
     * @param  array<string, mixed>  $filters
     */
    private function filterByStatus(Builder $query, array $filters): void
    {
        if (! $this->filled($filters, 'status')) {
            return;
        }

        $status = $filters['status'];

        $query->where(function (Builder $q) use ($status) {
            $q->where('status', $status)
                ->orWhereHas('orders', fn (Builder $oq) => $oq->where('status', $status));
        });
    }

    /**
     * @param  Builder<Lead>  $query
     * @param  array<string, mixed>  $filters
     */
    private function filterByBookingStatusGroup(Builder $query, array $filters): void
    {
        match ($filters['booking_status_group'] ?? null) {
            'active' => $query->whereHas('orders', fn (Builder $q) => $q->whereIn('status', self::ACTIVE_BOOKING_STATUSES)),
            'received' => $query->whereHas('orders', fn (Builder $q) => $q->whereIn('status', self::RECEIVED_BOOKING_STATUSES)),
            'closed', 'lost' => $query->whereHas('orders', fn (Builder $q) => $q->whereIn('status', self::CLOSED_BOOKING_STATUSES)->orWhere('status', 'like', 'lost_%')),
            'no_orders' => $query->whereDoesntHave('orders'),
            default => null,
        };
    }

    /**
     * @param  Builder<Lead>  $query
     * @param  array<string, mixed>  $filters
     */
    private function filterBySearch(Builder $query, array $filters): void
    {
        if (! $this->filled($filters, 'search')) {
            return;
        }

        $search = trim((string) $filters['search']);

        $query->where(function (Builder $q) use ($search) {
            $q->where('client_name', 'like', "%{$search}%")
                ->orWhere('client_phone', 'like', "%{$search}%")
                ->orWhere('client_email', 'like', "%{$search}%");
        });
    }

    /**
     * Mirror Request::filled(): present and not an empty string.
     *
     * @param  array<string, mixed>  $filters
     */
    private function filled(array $filters, string $key): bool
    {
        $value = $filters[$key] ?? null;

        return ! is_null($value) && ! (is_string($value) && trim($value) === '');
    }
}
