<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Employee;
use App\Models\Task;

class TaskPolicy
{
    public function viewAny(Employee $employee): bool
    {
        return true;
    }

    /**
     * Admins see every task; other employees see only tasks assigned to or created by them.
     */
    public function view(Employee $employee, Task $task): bool
    {
        return $employee->isAdmin()
            || (int) $task->assigned_to === $employee->id
            || (int) $task->created_by === $employee->id;
    }

    public function create(Employee $employee): bool
    {
        return true;
    }

    public function update(Employee $employee, Task $task): bool
    {
        return $this->view($employee, $task);
    }

    public function delete(Employee $employee, Task $task): bool
    {
        return $employee->isAdmin() || (int) $task->created_by === $employee->id;
    }
}
