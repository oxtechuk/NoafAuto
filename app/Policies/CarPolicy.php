<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Car;
use App\Models\Employee;

class CarPolicy
{
    public function viewAny(Employee $employee): bool
    {
        return $employee->isAdmin() || $employee->checkPermissionTo('manage-cars', 'employee');
    }

    public function view(Employee $employee, Car $car): bool
    {
        return $this->viewAny($employee);
    }

    public function create(Employee $employee): bool
    {
        return $employee->isAdmin() || $employee->checkPermissionTo('manage-cars', 'employee');
    }

    public function update(Employee $employee, Car $car): bool
    {
        return $employee->isAdmin() || $employee->checkPermissionTo('manage-cars', 'employee');
    }

    public function delete(Employee $employee, Car $car): bool
    {
        return $employee->isAdmin() || $employee->checkPermissionTo('manage-cars', 'employee');
    }
}
