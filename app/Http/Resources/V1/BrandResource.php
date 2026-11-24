<?php

declare(strict_types=1);

namespace App\Http\Resources\V1;

use App\Models\Brand;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Brand
 */
class BrandResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $logo = $this->logo;
        if ($logo && preg_match('#https?://[^/]+/(images/[^\s]+)#', $logo, $matches)) {
            $logo = '/'.$matches[1];
        }

        return [
            'id' => $this->id,
            'name' => $this->getTranslation('name', app()->getLocale(), false) ?: $this->name,
            'name_translations' => $this->getTranslations('name'),
            'slug' => $this->slug,
            'logo' => $logo,
            'is_active' => (bool) $this->is_active,
            'brand_type_id' => $this->brand_type_id,
            'brand_type' => $this->whenLoaded('brandType', fn () => $this->brandType ? [
                'id' => $this->brandType->id,
                'name' => $this->brandType->name,
            ] : null),
            'cars_count' => $this->whenCounted('cars'),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
