<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Employee;
use Spatie\Permission\Models\Role;

class RolePolicy
{
    public function viewAny(Employee $employee): bool
    {
        return $employee->isAdmin() || $employee->checkPermissionTo('manage-roles', 'employee');
    }

    public function view(Employee $employee, Role $role): bool
    {
        return $this->viewAny($employee);
    }

    public function create(Employee $employee): bool
    {
        return $employee->isAdmin() || $employee->checkPermissionTo('manage-roles', 'employee');
    }

    public function update(Employee $employee, Role $role): bool
    {
        return $employee->isAdmin() || $employee->checkPermissionTo('manage-roles', 'employee');
    }

    public function delete(Employee $employee, Role $role): bool
    {
        if ($role->name === 'admin') {
            return false;
        }

        return $employee->isAdmin() || $employee->checkPermissionTo('manage-roles', 'employee');
    }
}
