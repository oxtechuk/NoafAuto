<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Api\Contracts\ApiResponse;
use App\Http\Controllers\Api\ApiBaseController;
use App\Http\Requests\Api\V1\Employees\EmployeeStoreRequest;
use App\Http\Requests\Api\V1\Employees\EmployeeUpdateRequest;
use App\Http\Resources\V1\EmployeeResource;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class EmployeeController extends ApiBaseController
{
    private const RELATIONS = ['roles.permissions', 'permissions'];

    private const MAX_PER_PAGE = 100;

    public function index(Request $request): ApiResponse
    {
        Gate::authorize('viewAny', Employee::class);

        $query = Employee::query()->with(self::RELATIONS)->withCount('bookings');

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->filled('role')) {
            $query->where('role', $request->input('role'));
        }

        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if ($request->boolean('all')) {
            $employees = $query->orderBy('name')->get();

            return $this->respondSuccess(
                EmployeeResource::collection($employees)->resolve(),
                'Employees retrieved successfully'
            );
        }

        $perPage = min(max((int) $request->integer('per_page', 20), 1), self::MAX_PER_PAGE);
        $employees = $query->latest()->paginate($perPage)->withQueryString();
        $employees->setCollection(collect(EmployeeResource::collection($employees->getCollection())->resolve()));

        return $this->respondPaginated($employees, 'Employees retrieved successfully');
    }

    public function store(EmployeeStoreRequest $request): ApiResponse
    {
        Gate::authorize('create', Employee::class);

        $data = $request->validated();
        $data['password'] = Hash::make($data['password']);

        $employee = Employee::create($data);

        $roleName = (string) $request->input('role');
        $role = Role::where('name', $roleName)->where('guard_name', 'employee')->first();
        if ($role) {
            $employee->assignRole($role);
        }

        return $this->respondCreated($this->employeeData($employee), 'Employee created successfully');
    }

    public function show(Employee $employee): ApiResponse
    {
        Gate::authorize('view', $employee);

        return $this->respondSuccess($this->employeeData($employee));
    }

    public function update(EmployeeUpdateRequest $request, Employee $employee): ApiResponse
    {
        Gate::authorize('update', $employee);

        $data = $request->validated();
        if (! empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        $employee->update($data);

        $roleName = (string) $request->input('role');
        $role = Role::where('name', $roleName)->where('guard_name', 'employee')->first();
        if ($role) {
            $employee->syncRoles([$role]);
        }

        return $this->respondSuccess($this->employeeData($employee), 'Employee updated successfully');
    }

    public function destroy(Request $request, Employee $employee): ApiResponse
    {
        Gate::authorize('delete', $employee);

        $currentEmployee = $request->user('employee');
        if ($currentEmployee && $currentEmployee->id === $employee->id) {
            abort(403, 'Cannot delete your own account');
        }

        $employee->delete();

        return $this->respondDeleted('Employee deleted successfully');
    }

    public function toggleActive(Request $request, Employee $employee): ApiResponse
    {
        Gate::authorize('update', $employee);

        $currentEmployee = $request->user('employee');
        if ($currentEmployee && $currentEmployee->id === $employee->id) {
            abort(403, 'Cannot deactivate your own account');
        }

        $employee->update(['is_active' => ! $employee->is_active]);

        return $this->respondSuccess(
            $this->employeeData($employee),
            $employee->is_active ? 'Employee activated successfully' : 'Employee deactivated successfully'
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function employeeData(Employee $employee): array
    {
        $employee->load(self::RELATIONS)->loadCount('bookings');

        return (new EmployeeResource($employee))->resolve();
    }
}
