<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Infrastructure;

use App\Http\Requests\Api\ApiBaseRequest;

final class UpdateRedisRequest extends ApiBaseRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user('employee')?->isAdmin();
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'enabled' => ['required', 'boolean'],
            'host' => ['required_if:enabled,true', 'nullable', 'string', 'max:255', 'regex:/^[A-Za-z0-9.\-:\[\]]+$/'],
            'port' => ['required_if:enabled,true', 'nullable', 'integer', 'between:1,65535'],
            'password' => ['nullable', 'string', 'max:255'],
            'clear_password' => ['sometimes', 'boolean'],
            'database' => ['sometimes', 'integer', 'between:0,14'],
            'use_for_cache' => ['sometimes', 'boolean'],
            'use_for_session' => ['sometimes', 'boolean'],
            'use_for_queue' => ['sometimes', 'boolean'],
        ];
    }
}
