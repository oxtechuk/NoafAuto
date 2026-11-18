<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Roles;

use App\Http\Requests\Api\ApiBaseRequest;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;

final class RoleRequest extends ApiBaseRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        /** @var Role|null $role */
        $role = $this->route('role');
        $roleId = $role instanceof Role ? $role->id : (int) $role;

        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('roles', 'name')->where('guard_name', 'employee')->ignore($roleId ?: null),
            ],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ];
    }
}
