<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Brand;
use App\Models\Employee;

class BrandPolicy
{
    public function viewAny(Employee $employee): bool
    {
        return $employee->isAdmin() || $employee->checkPermissionTo('manage-brands', 'employee');
    }

    public function view(Employee $employee, Brand $brand): bool
    {
        return $this->viewAny($employee);
    }

    public function create(Employee $employee): bool
    {
        return $employee->isAdmin() || $employee->checkPermissionTo('manage-brands', 'employee');
    }

    public function update(Employee $employee, Brand $brand): bool
    {
        return $employee->isAdmin() || $employee->checkPermissionTo('manage-brands', 'employee');
    }

    public function delete(Employee $employee, Brand $brand): bool
    {
        return $employee->isAdmin() || $employee->checkPermissionTo('manage-brands', 'employee');
    }
}
