<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Api\Contracts\ApiResponse;
use App\Http\Controllers\Api\ApiBaseController;
use App\Http\Requests\Api\V1\Tasks\TaskPostponeRequest;
use App\Http\Requests\Api\V1\Tasks\TaskRequest;
use App\Http\Resources\V1\TaskResource;
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

        $data = $request->validated();
        $data['created_by'] = $request->user('employee')->id;

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

    /**
     * @return array<string, mixed>
     */
    private function taskData(Task $task): array
    {
        $task->load(self::RELATIONS);

        return (new TaskResource($task))->resolve();
    }
}
