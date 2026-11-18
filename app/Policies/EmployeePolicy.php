<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Employee;

class EmployeePolicy
{
    public function viewAny(Employee $employee): bool
    {
        return $employee->isAdmin() || $employee->checkPermissionTo('manage-employees', 'employee');
    }

    public function view(Employee $employee, Employee $target): bool
    {
        return $employee->isAdmin()
            || $employee->id === $target->id
            || $employee->checkPermissionTo('manage-employees', 'employee');
    }

    public function create(Employee $employee): bool
    {
        return $employee->isAdmin() || $employee->checkPermissionTo('manage-employees', 'employee');
    }

    public function update(Employee $employee, Employee $target): bool
    {
        return $employee->isAdmin()
            || $employee->id === $target->id
            || $employee->checkPermissionTo('manage-employees', 'employee');
    }

    public function delete(Employee $employee, Employee $target): bool
    {
        if ($employee->id === $target->id) {
            return false;
        }

        return $employee->isAdmin() || $employee->checkPermissionTo('manage-employees', 'employee');
    }
}
