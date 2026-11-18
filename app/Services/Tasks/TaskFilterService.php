<?php

declare(strict_types=1);

namespace App\Services\Tasks;

use App\Models\Employee;
use App\Models\Task;
use Illuminate\Database\Eloquent\Builder;

class TaskFilterService
{
    /**
     * @param  Builder<Task>  $query
     * @param  array<string, mixed>  $filters
     * @return Builder<Task>
     */
    public function apply(Builder $query, array $filters, Employee $viewer): Builder
    {
        $this->scopeToViewer($query, $filters, $viewer);
        $this->filterByStatus($query, $filters);
        $this->filterByPriority($query, $filters);
        $this->filterByView($query, $filters);
        $this->filterByDateRange($query, $filters);
        $this->filterByBooking($query, $filters);
        $this->filterBySearch($query, $filters);

        $this->applySorting($query, $filters);

        return $query;
    }

    /**
     * @param  Builder<Task>  $query
     * @param  array<string, mixed>  $filters
     */
    private function scopeToViewer(Builder $query, array $filters, Employee $viewer): void
    {
        if (! $viewer->isAdmin()) {
            $query->where(function (Builder $q) use ($viewer) {
                $q->where('assigned_to', $viewer->id)
                    ->orWhere('created_by', $viewer->id);
            });
        } elseif ($this->filled($filters, 'assigned_to')) {
            $query->where('assigned_to', $filters['assigned_to']);
        } elseif ($this->filled($filters, 'employee_id')) {
            $query->where('assigned_to', $filters['employee_id']);
        }
    }

    /**
     * @param  Builder<Task>  $query
     * @param  array<string, mixed>  $filters
     */
    private function filterByStatus(Builder $query, array $filters): void
    {
        if ($this->filled($filters, 'status')) {
            $query->where('status', $filters['status']);
        }
    }

    /**
     * @param  Builder<Task>  $query
     * @param  array<string, mixed>  $filters
     */
    private function filterByPriority(Builder $query, array $filters): void
    {
        if ($this->filled($filters, 'priority')) {
            $query->where('priority', $filters['priority']);
        }
    }

    /**
     * @param  Builder<Task>  $query
     * @param  array<string, mixed>  $filters
     */
    private function filterByView(Builder $query, array $filters): void
    {
        $view = $filters['view'] ?? null;

        if ($view === 'today') {
            $query->whereDate('due_date', today());
        } elseif ($view === 'overdue') {
            $query->where('status', '!=', 'done')
                ->whereDate('due_date', '<', today());
        } elseif ($view === 'upcoming') {
            $query->whereDate('due_date', '>', today());
        }
    }

    /**
     * @param  Builder<Task>  $query
     * @param  array<string, mixed>  $filters
     */
    private function filterByDateRange(Builder $query, array $filters): void
    {
        if ($this->filled($filters, 'from')) {
            $query->whereDate('due_date', '>=', $filters['from']);
        }

        if ($this->filled($filters, 'to')) {
            $query->whereDate('due_date', '<=', $filters['to']);
        }
    }

    /**
     * @param  Builder<Task>  $query
     * @param  array<string, mixed>  $filters
     */
    private function filterByBooking(Builder $query, array $filters): void
    {
        if ($this->filled($filters, 'booking_id')) {
            $query->where('booking_id', $filters['booking_id']);
        }
    }

    /**
     * @param  Builder<Task>  $query
     * @param  array<string, mixed>  $filters
     */
    private function filterBySearch(Builder $query, array $filters): void
    {
        if (! $this->filled($filters, 'search')) {
            return;
        }

        $search = trim((string) $filters['search']);

        $query->where(function (Builder $q) use ($search) {
            $q->where('title', 'like', "%{$search}%")
                ->orWhere('description', 'like', "%{$search}%");
        });
    }

    /**
     * @param  Builder<Task>  $query
     * @param  array<string, mixed>  $filters
     */
    private function applySorting(Builder $query, array $filters): void
    {
        $sort = $filters['sort'] ?? 'priority';

        if ($sort === 'due_date') {
            $query->orderBy('due_date', 'asc');
        } elseif ($sort === 'oldest') {
            $query->oldest();
        } elseif ($sort === 'newest') {
            $query->latest();
        } else {
            // Priority sort: high -> medium -> low, then latest
            $query->orderByRaw("CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END")
                ->latest();
        }
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
