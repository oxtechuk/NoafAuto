<?php

namespace App\Policies;

use App\Models\Booking;
use App\Models\Employee;

class BookingPolicy
{
    public function viewAny(Employee $employee): bool
    {
        return $this->canManageBookings($employee);
    }

    /**
     * Admins see every booking; other employees only the bookings assigned to them.
     */
    public function view(Employee $employee, Booking $booking): bool
    {
        return $this->canManageBookings($employee)
            && ($employee->isAdmin() || (int) $booking->assigned_to === $employee->id);
    }

    public function create(Employee $employee): bool
    {
        return $this->canManageBookings($employee);
    }

    /**
     * Covers status changes, offer details, notes and documents.
     */
    public function update(Employee $employee, Booking $booking): bool
    {
        return $this->view($employee, $booking);
    }

    /**
     * Approving/rejecting close requests and reassigning are supervisor-only.
     */
    public function supervise(Employee $employee, Booking $booking): bool
    {
        return $this->canManageBookings($employee) && $employee->isAdmin();
    }

    public function delete(Employee $employee, Booking $booking): bool
    {
        return $this->supervise($employee, $booking);
    }

    private function canManageBookings(Employee $employee): bool
    {
        return $employee->isAdmin() || $employee->checkPermissionTo('manage-bookings', 'employee');
    }
}
