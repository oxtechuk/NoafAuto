<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Auth;

use App\Http\Requests\Api\ApiBaseRequest;

final class LoginRequest extends ApiBaseRequest
{
    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'username' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string'],
            'remember' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * Build guard credentials, accepting either a username or an email address.
     * Only active employees may authenticate.
     *
     * @return array{password: string, is_active: true, username?: string, email?: string}
     */
    public function credentials(): array
    {
        $login = (string) $this->validated('username');
        $field = str_contains($login, '@') ? 'email' : 'username';

        return [
            $field => $login,
            'password' => (string) $this->validated('password'),
            'is_active' => true,
        ];
    }
}
