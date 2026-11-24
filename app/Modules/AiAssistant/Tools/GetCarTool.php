<?php

declare(strict_types=1);

namespace App\Modules\AiAssistant\Tools;

use App\Models\Car;
use App\Services\Api\Store\Helpers\SlugResolver;

class GetCarTool implements AssistantTool
{
    public function name(): string
    {
        return 'get_car';
    }

    public function declaration(): array
    {
        return [
            'name' => $this->name(),
            'description' => 'تفاصيل سيارة واحدة (المواصفات، المميزات، العروض، التوفر) باستخدام الـ slug من نتائج البحث أو من الصفحة الحالية.',
            'parameters' => [
                'type' => 'OBJECT',
                'properties' => [
                    'slug' => ['type' => 'STRING', 'description' => 'معرّف السيارة (slug)'],
                ],
                'required' => ['slug'],
            ],
        ];
    }

    public function handle(array $args, ToolContext $context): ToolResult
    {
        $query = Car::query()
            ->with(['brand', 'category', 'images', 'activeOffers', 'specifications', 'features_list', 'safety_features'])
            ->where('is_active', true);
        SlugResolver::applyCarSlug($query, (string) ($args['slug'] ?? ''));

        $car = $query->first();
        if (! $car) {
            return ToolResult::error('السيارة غير موجودة أو غير متوفرة.');
        }

        $summary = CarSummary::from($car, $context->showPrices());
        $specs = collect((array) $car->specs)
            ->map(fn ($value, $key) => is_array($value) ? (($value['label'] ?? $key).': '.($value['value'] ?? '')) : "{$key}: {$value}")
            ->values()
            ->all();

        $details = $summary + array_filter([
            'description' => $car->description ? mb_substr(strip_tags((string) $car->description), 0, 600) : null,
            'specs' => $specs,
            'features' => $car->features_list->pluck('name')->all() ?: null,
            'safety_features' => $car->safety_features->pluck('name')->all() ?: null,
            'colors' => collect((array) $car->colors)->pluck('name')->filter()->values()->all() ?: null,
            'active_offers' => $car->activeOffers->map(fn ($offer) => array_filter([
                'title' => $offer->title,
                'special_price' => $context->showPrices() ? $offer->special_price : null,
                'special_installment' => $context->showPrices() ? $offer->special_installment : null,
                'ends_at' => $offer->ends_at?->toDateString(),
            ]))->all() ?: null,
        ]);

        return new ToolResult($details, ['type' => 'cars', 'cars' => [$summary]]);
    }
}
