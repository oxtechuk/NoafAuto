<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Employee;
use App\Models\Task;

class TaskPolicy
{
    public function viewAny(Employee $employee): bool
    {
        return $this->canManageTasks($employee);
    }

    /**
     * Admins see every task; other employees see tasks assigned to or created by them.
     */
    public function view(Employee $employee, Task $task): bool
    {
        if (! $this->canManageTasks($employee)) {
            return false;
        }

        return $employee->isAdmin()
            || (int) $task->assigned_to === $employee->id
            || (int) $task->created_by === $employee->id;
    }

    public function create(Employee $employee): bool
    {
        return $this->canManageTasks($employee);
    }

    public function update(Employee $employee, Task $task): bool
    {
        return $this->view($employee, $task);
    }

    public function delete(Employee $employee, Task $task): bool
    {
        if (! $this->canManageTasks($employee)) {
            return false;
        }

        return $employee->isAdmin() || (int) $task->created_by === $employee->id;
    }

    private function canManageTasks(Employee $employee): bool
    {
        return $employee->isAdmin() || $employee->checkPermissionTo('manage-tasks', 'employee');
    }
}
