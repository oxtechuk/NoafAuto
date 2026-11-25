<?php

declare(strict_types=1);

namespace App\Services\Reports\Sections;

use App\Models\Booking;
use App\Models\Employee;
use App\Models\Task;
use App\Services\Reports\ReportFilters;
use App\Services\Reports\ReportMetrics;
use App\Services\Reports\ReportSection;
use Illuminate\Database\Eloquent\Builder;

class TeamSection extends ReportSection
{
    public function key(): string
    {
        return 'team';
    }

    public function label(): string
    {
        return 'فريق المبيعات';
    }

    public function icon(): string
    {
        return 'users';
    }

    public function order(): int
    {
        return 20;
    }

    public function kpiDefinitions(): array
    {
        return [
            'active_reps' => ['label' => 'موظفين عليهم طلبات', 'format' => 'number'],
            'team_win_rate' => ['label' => 'نسبة إغلاق الفريق', 'format' => 'percent'],
            'overdue_followups' => ['label' => 'متابعات متأخرة الآن', 'format' => 'number', 'hint' => 'طلبات مفتوحة فات موعد متابعتها', 'lower_is_better' => true],
            'overdue_tasks' => ['label' => 'مهام متأخرة الآن', 'format' => 'number', 'lower_is_better' => true],
        ];
    }

    public function kpiValues(ReportFilters $filters): array
    {
        $row = $filters->bookings()->whereNotNull('bookings.assigned_to')->toBase()
            ->selectRaw('count(distinct bookings.assigned_to) as reps, '.ReportMetrics::bookingAggregates())
            ->first();

        return [
            'active_reps' => (int) ($row->reps ?? 0),
            'team_win_rate' => ReportMetrics::winRate((int) ($row->won ?? 0), (int) ($row->lost ?? 0)),
            'overdue_followups' => $this->overdueFollowUps($filters)->count(),
            'overdue_tasks' => $this->tasks($filters)->where('status', '!=', 'done')->where('due_date', '<', now()->startOfDay())->count(),
        ];
    }

    public function details(ReportFilters $filters): array
    {
        $won = ReportMetrics::isWon();
        $days = ReportMetrics::daysBetween('bookings.created_at', 'bookings.delivered_at');

        $bookings = $filters->bookings()->whereNotNull('bookings.assigned_to')->toBase()
            ->selectRaw('bookings.assigned_to, '.ReportMetrics::bookingAggregates().", avg(case when {$won} and bookings.delivered_at is not null then {$days} end) as close_days")
            ->groupBy('bookings.assigned_to')
            ->get()
            ->keyBy('assigned_to');

        $leads = $filters->leads()->whereNotNull('leads.assigned_to')->toBase()
            ->selectRaw('leads.assigned_to, count(*) as total')
            ->groupBy('leads.assigned_to')
            ->pluck('total', 'assigned_to');

        $followUps = $this->overdueFollowUps($filters)->whereNotNull('bookings.assigned_to')->toBase()
            ->selectRaw('bookings.assigned_to, count(*) as total')
            ->groupBy('bookings.assigned_to')
            ->pluck('total', 'assigned_to');

        $today = now()->startOfDay()->toDateTimeString();
        $tasks = $this->tasks($filters)->whereNotNull('assigned_to')->toBase()
            ->selectRaw("assigned_to, sum(case when status != 'done' then 1 else 0 end) as open, sum(case when status != 'done' and due_date < ? then 1 else 0 end) as overdue", [$today])
            ->groupBy('assigned_to')
            ->get()
            ->keyBy('assigned_to');

        $ids = collect([...$bookings->keys(), ...$leads->keys(), ...$followUps->keys(), ...$tasks->keys()])->map(fn ($id) => (int) $id)->unique();
        $names = Employee::query()->whereIn('id', $ids)->pluck('name', 'id');

        $rows = $ids->map(function (int $id) use ($bookings, $leads, $followUps, $tasks, $names) {
            $row = $bookings[$id] ?? null;

            return [
                'employee_id' => $id,
                'name' => $names[$id] ?? "موظف #{$id}",
                'leads' => (int) ($leads[$id] ?? 0),
                ...$this->bookingCells($row),
                'avg_close_days' => isset($row->close_days) ? round(max(0, (float) $row->close_days), 1) : null,
                'overdue_followups' => (int) ($followUps[$id] ?? 0),
                'open_tasks' => (int) ($tasks[$id]->open ?? 0),
                'overdue_tasks' => (int) ($tasks[$id]->overdue ?? 0),
            ];
        })->sortByDesc(fn (array $row) => [$row['won'], $row['commission'], $row['bookings']])->values()->all();

        return [
            'charts' => [
                $this->chart('won_by_rep', 'المكسوب لكل موظف', 'bar', [['key' => 'won', 'label' => 'مكسوب'], ['key' => 'lost', 'label' => 'خسران']],
                    array_map(fn (array $row) => ['label' => $row['name'], 'values' => ['won' => $row['won'], 'lost' => $row['lost']]], array_slice($rows, 0, 12))),
            ],
            'tables' => [
                $this->table('team', 'أداء الموظفين', [
                    ['key' => 'name', 'label' => 'الموظف'],
                    ['key' => 'leads', 'label' => 'العملاء', 'format' => 'number'],
                    ...$this->bookingColumns(),
                    ['key' => 'avg_close_days', 'label' => 'مدة الإغلاق', 'format' => 'days'],
                    ['key' => 'overdue_followups', 'label' => 'متابعات متأخرة', 'format' => 'number'],
                    ['key' => 'open_tasks', 'label' => 'مهام مفتوحة', 'format' => 'number'],
                    ['key' => 'overdue_tasks', 'label' => 'مهام متأخرة', 'format' => 'number'],
                ], $rows, 'المتابعات والمهام تعرض الوضع الحالي، باقي الأرقام للفترة المختارة'),
            ],
        ];
    }

    /**
     * @return Builder<Booking>
     */
    private function overdueFollowUps(ReportFilters $filters): Builder
    {
        return $filters->bookingsNow()
            ->where('bookings.follow_up_at', '<', now())
            ->whereNotIn('bookings.status', [...ReportMetrics::wonStatuses(), ...ReportMetrics::lostStatuses()]);
    }

    /**
     * @return Builder<Task>
     */
    private function tasks(ReportFilters $filters): Builder
    {
        return Task::query()->when($filters->employeeId, fn (Builder $q, int $id) => $q->where('assigned_to', $id));
    }
}
