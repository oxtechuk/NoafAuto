<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Employees;

use App\Http\Requests\Api\ApiBaseRequest;
use App\Models\Employee;
use Illuminate\Validation\Rule;

final class EmployeeUpdateRequest extends ApiBaseRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        /** @var Employee|null $employee */
        $employee = $this->route('employee');
        $employeeId = $employee instanceof Employee ? $employee->id : (int) $employee;

        return [
            'name' => ['required', 'string', 'max:255'],
            'username' => ['nullable', 'string', 'max:100', Rule::unique('employees', 'username')->ignore($employeeId)],
            'email' => ['required', 'email', 'max:255', Rule::unique('employees', 'email')->ignore($employeeId)],
            'password' => ['nullable', 'string', 'min:6'],
            'phone' => ['nullable', 'string', 'max:30'],
            'role' => ['required', 'string', 'max:50'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }
}
