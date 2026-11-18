<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Settings;

use App\Http\Requests\Api\ApiBaseRequest;

final class SettingUpdateRequest extends ApiBaseRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'settings' => ['required', 'array'],
            'settings.*' => ['nullable'],
        ];
    }
}
