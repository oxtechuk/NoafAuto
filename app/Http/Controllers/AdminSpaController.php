<?php

namespace App\Http\Controllers;

use App\Http\Resources\V1\EmployeeResource;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class AdminSpaController extends Controller
{
    /**
     * Serve the admin SPA shell with the signed-in employee inlined (same payload as GET /api/v1/auth/me),
     * so the panel renders without waiting for that request. Guests and inactive accounts get null.
     */
    public function __invoke(Request $request): Response
    {
        return response()
            ->view('admin', ['bootUser' => $this->bootUser($request->user('employee'))])
            ->header('Cache-Control', 'no-store, private');
    }

    /**
     * @return array<string, mixed>|null
     */
    private function bootUser(?Employee $employee): ?array
    {
        if ($employee === null || ! $employee->is_active) {
            return null;
        }

        $employee->loadMissing('roles.permissions', 'permissions');

        return (new EmployeeResource($employee))->resolve();
    }
}
