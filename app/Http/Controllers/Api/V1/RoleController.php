<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Api\Contracts\ApiResponse;
use App\Http\Controllers\Api\ApiBaseController;
use App\Http\Requests\Api\V1\Roles\RoleRequest;
use App\Http\Resources\V1\RoleResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleController extends ApiBaseController
{
    private const RELATIONS = ['permissions'];

    public function index(): ApiResponse
    {
        Gate::authorize('viewAny', Role::class);

        $roles = Role::where('guard_name', 'employee')
            ->with(self::RELATIONS)
            ->withCount('users')
            ->latest()
            ->get();

        return $this->respondSuccess(
            RoleResource::collection($roles)->resolve(),
            'Roles retrieved successfully'
        );
    }

    public function permissions(): ApiResponse
    {
        Gate::authorize('viewAny', Role::class);

        $permissions = Permission::where('guard_name', 'employee')
            ->orderBy('name')
            ->get(['id', 'name', 'guard_name']);

        return $this->respondSuccess($permissions, 'Permissions retrieved successfully');
    }

    public function store(RoleRequest $request): ApiResponse
    {
        Gate::authorize('create', Role::class);

        $role = Role::create([
            'name' => $request->input('name'),
            'guard_name' => 'employee',
        ]);

        if ($request->has('permissions')) {
            $role->syncPermissions((array) $request->input('permissions'));
        }

        return $this->respondCreated($this->roleData($role), 'Role created successfully');
    }

    public function show(Role $role): ApiResponse
    {
        Gate::authorize('view', $role);

        return $this->respondSuccess($this->roleData($role));
    }

    public function update(RoleRequest $request, Role $role): ApiResponse
    {
        Gate::authorize('update', $role);

        $role->update(['name' => $request->input('name')]);

        if ($request->has('permissions')) {
            $role->syncPermissions((array) $request->input('permissions'));
        }

        return $this->respondSuccess($this->roleData($role), 'Role updated successfully');
    }

    public function destroy(Role $role): ApiResponse
    {
        Gate::authorize('delete', $role);

        if ($role->name === 'admin') {
            abort(403, 'Cannot delete primary admin role');
        }

        $role->delete();

        return $this->respondDeleted('Role deleted successfully');
    }

    public function storePermission(Request $request): ApiResponse
    {
        Gate::authorize('create', Role::class);

        $request->validate([
            'name' => ['required', 'string', 'max:100', 'unique:permissions,name'],
        ]);

        $permission = Permission::create([
            'name' => trim((string) $request->input('name')),
            'guard_name' => 'employee',
        ]);

        return $this->respondCreated($permission, 'تم إنشاء الصلاحية بنجاح');
    }

    /**
     * @return array<string, mixed>
     */
    private function roleData(Role $role): array
    {
        $role->load(self::RELATIONS)->loadCount('users');

        return (new RoleResource($role))->resolve();
    }
}
