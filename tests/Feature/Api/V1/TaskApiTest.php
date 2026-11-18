<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Models\Employee;
use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class TaskApiTest extends TestCase
{
    use RefreshDatabase;

    private Employee $admin;

    private Employee $employee;

    private Employee $otherEmployee;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::findOrCreate('manage-tasks', 'employee');

        $this->admin = Employee::factory()->admin()->create();

        $this->employee = Employee::factory()->create();
        $this->employee->givePermissionTo('manage-tasks');

        $this->otherEmployee = Employee::factory()->create();
        $this->otherEmployee->givePermissionTo('manage-tasks');
    }

    public function test_guest_cannot_access_tasks(): void
    {
        $this->getJson(route('api.v1.tasks.index'))->assertUnauthorized();
    }

    public function test_employee_without_permission_cannot_access_tasks(): void
    {
        $unauthorizedEmployee = Employee::factory()->create();

        $this->actingAs($unauthorizedEmployee, 'employee')
            ->getJson(route('api.v1.tasks.index'))
            ->assertForbidden();
    }

    public function test_admin_can_list_all_tasks_paginated(): void
    {
        Task::factory()->count(3)->create(['assigned_to' => $this->employee->id, 'created_by' => $this->admin->id]);
        Task::factory()->count(2)->create(['assigned_to' => $this->otherEmployee->id, 'created_by' => $this->admin->id]);

        $this->actingAs($this->admin, 'employee')
            ->getJson(route('api.v1.tasks.index', ['per_page' => 2]))
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.total', 5)
            ->assertJsonPath('meta.per_page', 2);
    }

    public function test_regular_employee_only_sees_assigned_or_created_tasks(): void
    {
        Task::factory()->count(2)->create([
            'assigned_to' => $this->employee->id,
            'created_by' => $this->admin->id,
        ]);

        Task::factory()->create([
            'assigned_to' => $this->otherEmployee->id,
            'created_by' => $this->otherEmployee->id,
        ]);

        $this->actingAs($this->employee, 'employee')
            ->getJson(route('api.v1.tasks.index'))
            ->assertOk()
            ->assertJsonPath('meta.total', 2);
    }

    public function test_filter_tasks_by_status(): void
    {
        Task::factory()->create([
            'title' => 'New Task',
            'status' => 'new',
            'assigned_to' => $this->employee->id,
            'created_by' => $this->admin->id,
        ]);

        Task::factory()->create([
            'title' => 'Done Task',
            'status' => 'done',
            'assigned_to' => $this->employee->id,
            'created_by' => $this->admin->id,
        ]);

        $this->actingAs($this->employee, 'employee')
            ->getJson(route('api.v1.tasks.index', ['status' => 'done']))
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.title', 'Done Task');
    }

    public function test_filter_tasks_by_priority(): void
    {
        Task::factory()->create([
            'title' => 'Urgent Task',
            'priority' => 'high',
            'assigned_to' => $this->employee->id,
            'created_by' => $this->admin->id,
        ]);

        Task::factory()->create([
            'title' => 'Normal Task',
            'priority' => 'low',
            'assigned_to' => $this->employee->id,
            'created_by' => $this->admin->id,
        ]);

        $this->actingAs($this->employee, 'employee')
            ->getJson(route('api.v1.tasks.index', ['priority' => 'high']))
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.title', 'Urgent Task');
    }

    public function test_filter_tasks_by_view_today_and_search(): void
    {
        Task::factory()->create([
            'title' => 'Call VIP Client Today',
            'due_date' => today()->toDateString(),
            'assigned_to' => $this->employee->id,
            'created_by' => $this->admin->id,
        ]);

        Task::factory()->create([
            'title' => 'Prepare report next week',
            'due_date' => today()->addDays(7)->toDateString(),
            'assigned_to' => $this->employee->id,
            'created_by' => $this->admin->id,
        ]);

        $this->actingAs($this->employee, 'employee')
            ->getJson(route('api.v1.tasks.index', ['view' => 'today', 'search' => 'VIP']))
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.title', 'Call VIP Client Today');
    }

    public function test_create_task_assigns_created_by_to_current_employee(): void
    {
        $payload = [
            'title' => 'Follow up on financing offer',
            'description' => 'Customer needs clarification on interest rate',
            'status' => 'new',
            'priority' => 'high',
            'assigned_to' => $this->employee->id,
            'due_date' => now()->addDays(3)->toDateString(),
        ];

        $response = $this->actingAs($this->employee, 'employee')
            ->postJson(route('api.v1.tasks.store'), $payload)
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.title', 'Follow up on financing offer')
            ->assertJsonPath('data.priority', 'high');

        $this->assertDatabaseHas('tasks', [
            'id' => $response->json('data.id'),
            'title' => 'Follow up on financing offer',
            'created_by' => $this->employee->id,
            'assigned_to' => $this->employee->id,
        ]);
    }

    public function test_create_task_validation(): void
    {
        $this->actingAs($this->employee, 'employee')
            ->postJson(route('api.v1.tasks.store'), [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['title', 'status', 'priority']);
    }

    public function test_show_task(): void
    {
        $task = Task::factory()->create([
            'title' => 'Review documents',
            'assigned_to' => $this->employee->id,
            'created_by' => $this->admin->id,
        ]);

        $this->actingAs($this->employee, 'employee')
            ->getJson(route('api.v1.tasks.show', $task))
            ->assertOk()
            ->assertJsonPath('data.id', $task->id)
            ->assertJsonPath('data.title', 'Review documents');

        // Other employee cannot see it
        $this->actingAs($this->otherEmployee, 'employee')
            ->getJson(route('api.v1.tasks.show', $task))
            ->assertForbidden();

        // Admin can see it
        $this->actingAs($this->admin, 'employee')
            ->getJson(route('api.v1.tasks.show', $task))
            ->assertOk();
    }

    public function test_update_task(): void
    {
        $task = Task::factory()->create([
            'title' => 'Original Title',
            'status' => 'new',
            'priority' => 'low',
            'assigned_to' => $this->employee->id,
            'created_by' => $this->employee->id,
        ]);

        $this->actingAs($this->employee, 'employee')
            ->putJson(route('api.v1.tasks.update', $task), [
                'title' => 'Updated Title',
                'status' => 'in_progress',
                'priority' => 'high',
            ])
            ->assertOk()
            ->assertJsonPath('data.title', 'Updated Title')
            ->assertJsonPath('data.status', 'in_progress')
            ->assertJsonPath('data.priority', 'high');

        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'title' => 'Updated Title',
            'status' => 'in_progress',
            'priority' => 'high',
        ]);
    }

    public function test_toggle_task_status(): void
    {
        $task = Task::factory()->create([
            'status' => 'new',
            'assigned_to' => $this->employee->id,
            'created_by' => $this->admin->id,
        ]);

        // new -> in_progress
        $this->actingAs($this->employee, 'employee')
            ->postJson(route('api.v1.tasks.toggle', $task))
            ->assertOk()
            ->assertJsonPath('data.status', 'in_progress');

        // in_progress -> done
        $this->actingAs($this->employee, 'employee')
            ->postJson(route('api.v1.tasks.toggle', $task))
            ->assertOk()
            ->assertJsonPath('data.status', 'done');

        // done -> new
        $this->actingAs($this->employee, 'employee')
            ->postJson(route('api.v1.tasks.toggle', $task))
            ->assertOk()
            ->assertJsonPath('data.status', 'new');
    }

    public function test_start_and_complete_task(): void
    {
        $task = Task::factory()->create([
            'status' => 'new',
            'assigned_to' => $this->employee->id,
            'created_by' => $this->admin->id,
        ]);

        $this->actingAs($this->employee, 'employee')
            ->postJson(route('api.v1.tasks.start', $task))
            ->assertOk()
            ->assertJsonPath('data.status', 'in_progress');

        $this->actingAs($this->employee, 'employee')
            ->postJson(route('api.v1.tasks.complete', $task))
            ->assertOk()
            ->assertJsonPath('data.status', 'done');
    }

    public function test_postpone_task(): void
    {
        $task = Task::factory()->create([
            'due_date' => '2026-11-20',
            'assigned_to' => $this->employee->id,
            'created_by' => $this->admin->id,
        ]);

        $this->actingAs($this->employee, 'employee')
            ->postJson(route('api.v1.tasks.postpone', $task), ['days' => 5])
            ->assertOk()
            ->assertJsonPath('data.due_date', '2026-11-25');
    }

    public function test_delete_task(): void
    {
        $task = Task::factory()->create([
            'assigned_to' => $this->employee->id,
            'created_by' => $this->employee->id,
        ]);

        // Other employee cannot delete
        $this->actingAs($this->otherEmployee, 'employee')
            ->deleteJson(route('api.v1.tasks.destroy', $task))
            ->assertForbidden();

        // Creator can delete
        $this->actingAs($this->employee, 'employee')
            ->deleteJson(route('api.v1.tasks.destroy', $task))
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('tasks', ['id' => $task->id]);
    }
}
