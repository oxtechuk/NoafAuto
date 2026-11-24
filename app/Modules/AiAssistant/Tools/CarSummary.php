<?php

declare(strict_types=1);

namespace App\Modules\AiAssistant\Tools;

use App\Models\Car;

/**
 * Compact, model-friendly description of a car (same numbers the storefront shows).
 */
final class CarSummary
{
    /**
     * @return array<string, mixed>
     */
    public static function from(Car $car, bool $showPrices): array
    {
        $offer = $car->relationLoaded('activeOffers') ? $car->activeOffers->first() : null;
        $price = $offer?->special_price ?: $car->cash_price;

        return array_filter([
            'slug' => $car->slug,
            'name' => $car->name,
            'brand' => $car->brand?->name,
            'year' => (int) $car->year,
            'type' => $car->type,
            'category' => $car->category?->name,
            'fuel' => $car->specs['fuel'] ?? null,
            'horsepower' => $car->horsepower,
            'seats' => $car->specs['seats'] ?? null,
            'price' => $showPrices ? (float) $price : null,
            'original_price' => $showPrices && $offer?->special_price ? (float) $car->cash_price : null,
            'monthly_from' => $showPrices && $car->min_installment ? (float) $car->min_installment : null,
            'min_down_payment' => $showPrices && $car->min_down_payment ? (float) $car->min_down_payment : null,
            'availability' => $car->availability_status,
            'offer' => $offer?->title,
            'image' => $car->main_image,
            'url' => '/cars/'.$car->slug,
        ], fn ($value) => $value !== null && $value !== '');
    }
}
