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
        $rawThumb = $this->getRawOriginal('thumbnail');
        $thumbnail = $this->thumbnail;
        if (! $thumbnail || $this->isImageDeleted($rawThumb)) {
            $thumbnail = $this->main_image;
        } elseif (preg_match('#https?://[^/]+/(images/[^\s]+)#', $thumbnail, $m)) {
            $thumbnail = '/'.$m[1];
        }

        $brandLogo = $this->relationLoaded('brand') ? $this->brand?->logo : null;
        if ($brandLogo && preg_match('#https?://[^/]+/(images/[^\s]+)#', $brandLogo, $m)) {
            $brandLogo = '/'.$m[1];
        }

        return [
            'id' => $this->id,
            'name' => $this->getTranslation('name', app()->getLocale(), false) ?: $this->name,
            'name_translations' => $this->getTranslations('name'),
            'slug' => $this->slug,
            'model' => $this->model,
            'year' => $this->year,
            'type' => $this->type,
            'color' => $this->color,
            'colors' => $this->colors,
            'cash_price' => $this->cash_price,
            'min_down_payment' => $this->min_down_payment,
            'min_installment' => $this->min_installment,
            'description' => $this->getTranslation('description', app()->getLocale(), false) ?: $this->description,
            'description_translations' => $this->getTranslations('description'),
            'features_text' => $this->getTranslation('features', app()->getLocale(), false) ?: $this->features,
            'features_translations' => $this->getTranslations('features'),
            'thumbnail' => $thumbnail,
            'main_image' => $this->main_image,
            'badge_color' => $this->badge_color,
            'is_featured' => (bool) $this->is_featured,
            'is_active' => (bool) $this->is_active,
            'is_highlighted' => $this->is_highlighted,
            'availability_status' => $this->availability_status,
            'views' => $this->views,
            'brand_id' => $this->brand_id,
            'category_id' => $this->category_id,
            'car_model_id' => $this->car_model_id,
            'brand' => $this->whenLoaded('brand', fn () => $this->brand ? [
                'id' => $this->brand->id,
                'name' => $this->brand->getTranslation('name', app()->getLocale(), false) ?: $this->brand->name,
                'logo' => $brandLogo,
            ] : null),
            'category' => $this->whenLoaded('category', fn () => $this->category ? [
                'id' => $this->category->id,
                'name' => $this->category->name,
            ] : null),
            'car_model' => $this->whenLoaded('carModel', fn () => $this->carModel ? [
                'id' => $this->carModel->id,
                'name' => $this->carModel->name,
            ] : null),
            'images' => $this->whenLoaded('images', fn () => $this->images->map(fn ($img) => [
                'id' => $img->id,
                'image_path' => $img->image_path,
                'type' => $img->type,
                'sort_order' => $img->sort_order,
            ])),
            'specifications' => $this->whenLoaded('specifications', fn () => $this->specifications->pluck('id')),
            'features_list' => $this->whenLoaded('features_list', fn () => $this->features_list->pluck('id')),
            'safety_features' => $this->whenLoaded('safety_features', fn () => $this->safety_features->pluck('id')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
