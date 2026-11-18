<?php

namespace App\Policies;

use App\Models\Employee;
use App\Models\Lead;

class LeadPolicy
{
    /**
     * Determine whether the employee can list leads (scoping happens in LeadFilterService).
     */
    public function viewAny(Employee $employee): bool
    {
        return $this->canManageLeads($employee);
    }

    /**
     * Admins see every lead; other employees only the leads assigned to them.
     */
    public function view(Employee $employee, Lead $lead): bool
    {
        return $this->canManageLeads($employee)
            && ($employee->isAdmin() || (int) $lead->assigned_to === $employee->id);
    }

    public function create(Employee $employee): bool
    {
        return $this->canManageLeads($employee);
    }

    public function update(Employee $employee, Lead $lead): bool
    {
        return $this->view($employee, $lead);
    }

    /**
     * Deleting lead records is restricted to supervisors/admins.
     */
    public function delete(Employee $employee, Lead $lead): bool
    {
        return $this->canManageLeads($employee) && $employee->isAdmin();
    }

    private function canManageLeads(Employee $employee): bool
    {
        return $employee->isAdmin() || $employee->checkPermissionTo('manage-leads', 'employee');
    }
}
