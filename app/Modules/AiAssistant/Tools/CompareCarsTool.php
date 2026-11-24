<?php

declare(strict_types=1);

namespace App\Modules\AiAssistant\Tools;

use App\Services\Api\Store\CompareApiService;

class CompareCarsTool implements AssistantTool
{
    public function __construct(private readonly CompareApiService $compare) {}

    public function name(): string
    {
        return 'compare_cars';
    }

    public function declaration(): array
    {
        return [
            'name' => $this->name(),
            'description' => 'قارن بين سيارتين أو ثلاث من المعرض (السعر، القسط، الأداء، المواصفات، المميزات).',
            'parameters' => [
                'type' => 'OBJECT',
                'properties' => [
                    'slugs' => ['type' => 'ARRAY', 'items' => ['type' => 'STRING'], 'description' => 'من 2 إلى 3 slugs'],
                ],
                'required' => ['slugs'],
            ],
        ];
    }

    public function handle(array $args, ToolContext $context): ToolResult
    {
        $slugs = array_slice(array_values(array_filter((array) ($args['slugs'] ?? []), 'is_string')), 0, 3);
        $result = $this->compare->compare($slugs);

        if ($result === []) {
            return ToolResult::error('لازم سيارتين على الأقل موجودتين في المعرض للمقارنة.');
        }

        $cars = collect($result['cars'])->map(fn (array $car) => array_filter([
            'slug' => $car['slug'] ?? null,
            'name' => $car['name'] ?? null,
            'price' => $context->showPrices() ? ($car['current_price'] ?? $car['cash_price'] ?? null) : null,
            'monthly_from' => $context->showPrices() ? ($car['min_installment'] ?? null) : null,
            'image' => $car['main_image'] ?? null,
            'url' => isset($car['slug']) ? '/cars/'.$car['slug'] : null,
        ]))->all();

        $sections = collect($result['sections'])->map(fn (array $section) => [
            'title' => $section['title'],
            'rows' => collect($section['rows'])
                ->reject(fn (array $row) => ! $context->showPrices() && str_contains((string) ($row['label'] ?? ''), 'سعر'))
                ->map(fn (array $row) => ['label' => $row['label'], 'values' => $row['values'], 'winner' => $row['winner'] ?? null])
                ->values()
                ->all(),
        ])->values()->all();

        return new ToolResult(
            ['cars' => $cars, 'sections' => $sections],
            ['type' => 'comparison', 'cars' => $cars, 'sections' => $sections],
        );
    }
}
