<?php

declare(strict_types=1);

namespace App\Http\Resources\V1;

use App\Models\Car;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Car
 */
class CarResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->getTranslation('name', app()->getLocale(), false) ?: $this->name,
            'name_translations' => $this->getTranslations('name'),
            'slug' => $this->slug,
            'model' => $this->model,
            'year' => $this->year,
            'type' => $this->type,
            'cash_price' => $this->cash_price,
            'min_down_payment' => $this->min_down_payment,
            'min_installment' => $this->min_installment,
            'thumbnail' => $this->thumbnail,
            'badge_color' => $this->badge_color,
            'is_featured' => (bool) $this->is_featured,
            'is_active' => (bool) $this->is_active,
            'is_highlighted' => (bool) $this->is_highlighted,
            'availability_status' => $this->availability_status,
            'views' => $this->views,
            'brand' => $this->whenLoaded('brand', fn () => $this->brand ? [
                'id' => $this->brand->id,
                'name' => $this->brand->getTranslation('name', app()->getLocale(), false) ?: $this->brand->name,
                'logo' => $this->brand->logo,
            ] : null),
            'category' => $this->whenLoaded('category', fn () => $this->category ? [
                'id' => $this->category->id,
                'name' => $this->category->name,
            ] : null),
            'car_model' => $this->whenLoaded('carModel', fn () => $this->carModel ? [
                'id' => $this->carModel->id,
                'name' => $this->carModel->name,
            ] : null),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
