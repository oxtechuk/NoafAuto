<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Api\Contracts\ApiResponse;
use App\Http\Controllers\Api\ApiBaseController;
use App\Http\Requests\Api\V1\Tasks\TaskPostponeRequest;
use App\Http\Requests\Api\V1\Tasks\TaskRequest;
use App\Http\Resources\V1\TaskResource;
use App\Models\Booking;
use App\Models\Task;
use App\Services\Tasks\TaskFilterService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class TaskController extends ApiBaseController
{
    private const RELATIONS = ['assignedTo', 'createdBy', 'booking'];

    private const MAX_PER_PAGE = 100;

    public function index(Request $request, TaskFilterService $filters): ApiResponse
    {
        Gate::authorize('viewAny', Task::class);

        $perPage = min(max((int) $request->integer('per_page', 20), 1), self::MAX_PER_PAGE);

        $query = Task::query()->with(self::RELATIONS);
        $filters->apply($query, $request->query(), $request->user('employee'));

        $tasks = $query->paginate($perPage)->withQueryString();
        $tasks->setCollection(collect(TaskResource::collection($tasks->getCollection())->resolve()));

        return $this->respondPaginated($tasks, 'Tasks retrieved successfully');
    }

    public function store(TaskRequest $request): ApiResponse
    {
        Gate::authorize('create', Task::class);

        $employee = $request->user('employee');
        $data = $request->validated();
        $data['created_by'] = $employee->id;

        if (! $employee->isAdmin()) {
            $data['assigned_to'] = $employee->id;
        }

        $task = Task::create($data);

        return $this->respondCreated($this->taskData($task), 'Task created successfully');
    }

    public function show(Task $task): ApiResponse
    {
        Gate::authorize('view', $task);

        return $this->respondSuccess($this->taskData($task));
    }

    public function update(TaskRequest $request, Task $task): ApiResponse
    {
        Gate::authorize('update', $task);

        $task->update($request->validated());

        return $this->respondSuccess($this->taskData($task), 'Task updated successfully');
    }

    public function destroy(Task $task): ApiResponse
    {
        Gate::authorize('delete', $task);

        $task->delete();

        return $this->respondDeleted('Task deleted successfully');
    }

    public function toggle(Task $task): ApiResponse
    {
        Gate::authorize('update', $task);

        $next = match ($task->status) {
            'new' => 'in_progress',
            'in_progress' => 'done',
            'done' => 'new',
            default => 'new',
        };

        $task->update(['status' => $next]);

        return $this->respondSuccess($this->taskData($task), 'Task status toggled successfully');
    }

    public function start(Task $task): ApiResponse
    {
        Gate::authorize('update', $task);

        $task->update(['status' => 'in_progress']);

        return $this->respondSuccess($this->taskData($task), 'Task started successfully');
    }

    public function complete(Task $task): ApiResponse
    {
        Gate::authorize('update', $task);

        $task->update(['status' => 'done']);

        return $this->respondSuccess($this->taskData($task), 'Task marked as done successfully');
    }

    public function postpone(TaskPostponeRequest $request, Task $task): ApiResponse
    {
        Gate::authorize('update', $task);

        $days = (int) $request->validated('days');
        $base = $task->due_date ? $task->due_date->copy() : now();

        $task->update(['due_date' => $base->addDays($days)]);

        return $this->respondSuccess($this->taskData($task), 'Task postponed successfully');
    }

    public function notificationsSummary(Request $request): ApiResponse
    {
        $employee = $request->user('employee');

        $tasksQuery = Task::query()
            ->with('assignedTo')
            ->where('status', '!=', 'done')
            ->whereDate('due_date', today());

        if (! $employee->isAdmin()) {
            $tasksQuery->where(function ($q) use ($employee) {
                $q->where('assigned_to', $employee->id)
                    ->orWhere('created_by', $employee->id);
            });
        }

        $todayTasksCount = (clone $tasksQuery)->count();
        $todayTasks = $tasksQuery
            ->orderByRaw("CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END")
            ->latest()
            ->take(10)
            ->get();

        $bookingsQuery = Booking::query()
            ->with('car')
            ->where('status', 'new');

        if (! $employee->isAdmin()) {
            $bookingsQuery->where('assigned_to', $employee->id);
        }

        $newBookingsCount = (clone $bookingsQuery)->count();
        $newBookings = $bookingsQuery->latest()->take(10)->get();

        return $this->respondSuccess([
            'today_tasks' => $todayTasks->map(fn (Task $t) => [
                'id' => $t->id,
                'title' => $t->title,
                'priority' => $t->priority,
                'due_date' => $t->due_date?->toDateString(),
                'assigned_to_name' => $t->assignedTo?->name,
            ])->values(),
            'new_bookings' => $newBookings->map(fn (Booking $b) => [
                'id' => $b->id,
                'client_name' => $b->client_name,
                'client_phone' => $b->client_phone,
                'car_name' => $b->car?->name,
                'created_at' => $b->created_at?->toIso8601String(),
            ])->values(),
            'counts' => [
                'today_tasks' => $todayTasksCount,
                'new_bookings' => $newBookingsCount,
                'total' => $todayTasksCount + $newBookingsCount,
            ],
        ], 'Notifications summary retrieved');
    }

    /**
     * @return array<string, mixed>
     */
    private function taskData(Task $task): array
    {
        $task->load(self::RELATIONS);

        return (new TaskResource($task))->resolve();
    }
}
