<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Employee;

class ReportPolicy
{
    public function viewAny(Employee $employee): bool
    {
        return $employee->isAdmin() || $employee->checkPermissionTo('manage-reports', 'employee');
    }
}
