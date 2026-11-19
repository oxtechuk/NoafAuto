<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Brands;

use App\Http\Requests\Api\ApiBaseRequest;

final class BrandRequest extends ApiBaseRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'array'],
            'name.ar' => ['required', 'string', 'max:100'],
            'name.en' => ['nullable', 'string', 'max:100'],
            'brand_type_id' => ['nullable', 'exists:brand_types,id'],
            'logo' => ['nullable'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }
}
