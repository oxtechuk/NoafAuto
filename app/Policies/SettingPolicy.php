<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Employee;

class SettingPolicy
{
    public function viewAny(Employee $employee): bool
    {
        return $employee->isAdmin() || $employee->checkPermissionTo('manage-settings', 'employee');
    }

    public function view(Employee $employee): bool
    {
        return $this->viewAny($employee);
    }

    public function update(Employee $employee): bool
    {
        return $employee->isAdmin() || $employee->checkPermissionTo('manage-settings', 'employee');
    }
}
