<?php

declare(strict_types=1);

namespace App\Http\Resources\V1;

use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Employee
 */
class EmployeeResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'username' => $this->username,
            'email' => $this->email,
            'phone' => $this->phone,
            'role' => $this->role,
            'is_active' => (bool) $this->is_active,
            'avatar' => $this->avatar,
            'roles' => $this->relationLoaded('roles')
                ? $this->roles->pluck('name')->values()->all()
                : null,
            'permissions' => $this->relationLoaded('roles') || $this->relationLoaded('permissions')
                ? $this->getAllPermissions()->pluck('name')->values()->all()
                : null,
            'bookings_count' => $this->whenCounted('bookings'),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
