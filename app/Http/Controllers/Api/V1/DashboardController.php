<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Api\Contracts\ApiResponse;
use App\Http\Controllers\Api\ApiBaseController;
use App\Models\Booking;
use App\Models\Employee;
use App\Models\Lead;
use App\Models\Task;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class DashboardController extends ApiBaseController
{
    private const ACTIVE_STATUSES = [
        'new', 'contacted_no_answer', 'recontact_client', 'waiting_documents',
        'bank_review', 'approved', 'authorized', 'contacted', 'interested',
    ];

    private const COMPLETED_STATUSES = ['received', 'sold', 'done'];

    public function stats(Request $request): ApiResponse
    {
        $employee = $request->user('employee');
        if (! $this->canAccessDashboard($employee)) {
            abort(403, 'Unauthorized to view dashboard');
        }

        $isAdmin = $employee->isAdmin();
        [$from, $to, $range] = $this->resolveRange($request);

        $bookingsQuery = Booking::query()
            ->when(! $isAdmin, fn (Builder $q) => $q->where('assigned_to', $employee->id))
            ->when($isAdmin && $request->filled('employee_id'), fn (Builder $q) => $q->where('assigned_to', $request->input('employee_id')))
            ->when($from && $to, fn (Builder $q) => $q->whereBetween('created_at', [$from, $to]));

        $leadsQuery = Lead::query()
            ->when(! $isAdmin, fn (Builder $q) => $q->where('assigned_to', $employee->id))
            ->when($isAdmin && $request->filled('employee_id'), fn (Builder $q) => $q->where('assigned_to', $request->input('employee_id')))
            ->when($from && $to, fn (Builder $q) => $q->whereBetween('created_at', [$from, $to]));

        $tasksQuery = Task::query()
            ->when(! $isAdmin, fn (Builder $q) => $q->where('assigned_to', $employee->id))
            ->when($isAdmin && $request->filled('employee_id'), fn (Builder $q) => $q->where('assigned_to', $request->input('employee_id')));

        $stats = [
            'range' => $range,
            'bookings' => [
                'total' => (clone $bookingsQuery)->count(),
                'active' => (clone $bookingsQuery)->whereIn('status', self::ACTIVE_STATUSES)->count(),
                'pending' => (clone $bookingsQuery)->where('status', 'pending')->count(),
                'completed' => (clone $bookingsQuery)->whereIn('status', self::COMPLETED_STATUSES)->count(),
                'closed' => (clone $bookingsQuery)->where(function (Builder $q) {
                    $q->where('status', 'like', 'lost_%')->orWhere('status', 'rejected');
                })->count(),
                'total_commission' => (float) (clone $bookingsQuery)->whereIn('status', self::COMPLETED_STATUSES)->sum('net_commission'),
            ],
            'leads' => [
                'total' => (clone $leadsQuery)->count(),
                'new' => (clone $leadsQuery)->where('status', 'new')->count(),
            ],
            'tasks' => [
                'total' => (clone $tasksQuery)->count(),
                'today' => (clone $tasksQuery)->whereDate('due_date', today())->where('status', '!=', 'done')->count(),
                'overdue' => (clone $tasksQuery)->whereDate('due_date', '<', today())->where('status', '!=', 'done')->count(),
                'done' => (clone $tasksQuery)->where('status', 'done')->count(),
            ],
        ];

        return $this->respondSuccess($stats, 'Dashboard stats retrieved successfully');
    }

    public function alerts(Request $request): ApiResponse
    {
        $employee = $request->user('employee');
        if (! $this->canAccessDashboard($employee)) {
            abort(403, 'Unauthorized to view dashboard alerts');
        }

        $isAdmin = $employee->isAdmin();
        $today = today();

        $tasksQuery = Task::query()
            ->when(! $isAdmin, fn (Builder $q) => $q->where('assigned_to', $employee->id))
            ->when($isAdmin && $request->filled('employee_id'), fn (Builder $q) => $q->where('assigned_to', $request->input('employee_id')));

        $bookingsQuery = Booking::query()
            ->when(! $isAdmin, fn (Builder $q) => $q->where('assigned_to', $employee->id))
            ->when($isAdmin && $request->filled('employee_id'), fn (Builder $q) => $q->where('assigned_to', $request->input('employee_id')));

        $overdueTasks = (clone $tasksQuery)
            ->whereDate('due_date', '<', $today)
            ->where('status', '!=', 'done')
            ->orderBy('due_date')
            ->limit(10)
            ->get(['id', 'title', 'due_date', 'priority', 'status', 'assigned_to']);

        $followUpsNeeded = (clone $bookingsQuery)
            ->whereIn('status', self::ACTIVE_STATUSES)
            ->where(function (Builder $q) {
                $q->whereNull('last_contacted_at')->orWhere('last_contacted_at', '<=', now()->subDays(2));
            })
            ->latest('created_at')
            ->limit(10)
            ->get(['id', 'order_number', 'client_name', 'client_phone', 'status', 'created_at']);

        return $this->respondSuccess([
            'overdue_tasks' => $overdueTasks,
            'follow_ups_needed' => $followUpsNeeded,
        ], 'Dashboard alerts retrieved successfully');
    }

    private function canAccessDashboard(Employee $employee): bool
    {
        return $employee->isAdmin() || $employee->checkPermissionTo('manage-dashboard', 'employee');
    }

    /**
     * @return array{0: ?Carbon, 1: ?Carbon, 2: string}
     */
    private function resolveRange(Request $request): array
    {
        $range = $request->get('range', 'all');
        $now = now();

        return match ($range) {
            'today' => [$now->copy()->startOfDay(), $now->copy()->endOfDay(), $range],
            'week' => [$now->copy()->startOfWeek(), $now->copy()->endOfWeek(), $range],
            'month' => [$now->copy()->startOfMonth(), $now->copy()->endOfMonth(), $range],
            'year' => [$now->copy()->startOfYear(), $now->copy()->endOfYear(), $range],
            'custom' => [
                $request->filled('from') ? Carbon::parse((string) $request->get('from'))->startOfDay() : null,
                $request->filled('to') ? Carbon::parse((string) $request->get('to'))->endOfDay() : $now->copy()->endOfDay(),
                $range,
            ],
            default => [null, null, 'all'],
        };
    }
}
