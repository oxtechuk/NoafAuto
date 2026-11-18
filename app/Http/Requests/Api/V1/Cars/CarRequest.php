<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Cars;

use App\Http\Requests\Api\ApiBaseRequest;

final class CarRequest extends ApiBaseRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'array'],
            'name.ar' => ['required', 'string', 'max:255'],
            'name.en' => ['nullable', 'string', 'max:255'],
            'model' => ['nullable', 'string', 'max:100'],
            'brand_id' => ['required', 'exists:brands,id'],
            'category_id' => ['nullable', 'exists:car_categories,id'],
            'car_model_id' => ['nullable', 'exists:car_models,id'],
            'year' => ['nullable', 'integer', 'min:1990', 'max:2040'],
            'type' => ['nullable', 'string', 'max:50'],
            'cash_price' => ['nullable', 'numeric', 'min:0'],
            'min_down_payment' => ['nullable', 'numeric', 'min:0'],
            'min_installment' => ['nullable', 'numeric', 'min:0'],
            'description' => ['nullable', 'array'],
            'description.ar' => ['nullable', 'string'],
            'description.en' => ['nullable', 'string'],
            'is_featured' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
            'is_highlighted' => ['nullable', 'boolean'],
            'availability_status' => ['nullable', 'string', 'max:50'],
        ];
    }
}
