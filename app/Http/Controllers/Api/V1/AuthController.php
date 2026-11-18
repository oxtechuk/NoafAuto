<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Api\Contracts\ApiResponse;
use App\Http\Controllers\Api\ApiBaseController;
use App\Http\Requests\Api\V1\Auth\LoginRequest;
use App\Http\Resources\V1\EmployeeResource;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends ApiBaseController
{
    /**
     * Start a cookie-based session for an active employee.
     */
    public function login(LoginRequest $request): ApiResponse
    {
        if (! Auth::guard('employee')->attempt($request->credentials(), $request->boolean('remember'))) {
            throw ValidationException::withMessages([
                'username' => __('auth.failed'),
            ]);
        }

        $request->session()->regenerate();

        return $this->respondSuccess($this->employeeData(Auth::guard('employee')->user()), 'Logged in successfully');
    }

    /**
     * Return the authenticated employee with roles and permissions.
     */
    public function me(Request $request): ApiResponse
    {
        return $this->respondSuccess($this->employeeData($request->user('employee')));
    }

    /**
     * End the current session.
     */
    public function logout(Request $request): ApiResponse
    {
        Auth::guard('employee')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return $this->respondSuccess(null, 'Logged out successfully');
    }

    /**
     * @return array<string, mixed>
     */
    private function employeeData(Employee $employee): array
    {
        $employee->loadMissing('roles.permissions', 'permissions');

        return (new EmployeeResource($employee))->resolve();
    }
}
