<?php

declare(strict_types=1);

namespace App\Modules\AiAssistant\Tools;

use App\Models\Car;
use Illuminate\Database\Eloquent\Builder;

class SearchCarsTool implements AssistantTool
{
    public function name(): string
    {
        return 'search_cars';
    }

    public function declaration(): array
    {
        return [
            'name' => $this->name(),
            'description' => 'ابحث في سيارات المعرض المتوفرة فعلياً حسب احتياج العميل. استخدمها قبل ترشيح أي سيارة أو ذكر أي سعر.',
            'parameters' => [
                'type' => 'OBJECT',
                'properties' => [
                    'query' => ['type' => 'STRING', 'description' => 'اسم أو موديل السيارة (اختياري)، مثل "كامري" أو "Sonet"'],
                    'brand' => ['type' => 'STRING', 'description' => 'اسم الماركة بالعربي أو الإنجليزي، مثل "تويوتا" أو "Toyota"'],
                    'body_type' => ['type' => 'STRING', 'description' => 'نوع الهيكل: suv, sedan, hatchback, pickup, coupe, van'],
                    'fuel' => ['type' => 'STRING', 'enum' => ['petrol', 'diesel', 'hybrid', 'electric']],
                    'max_cash_price' => ['type' => 'NUMBER', 'description' => 'أعلى سعر كاش بالريال'],
                    'min_cash_price' => ['type' => 'NUMBER', 'description' => 'أقل سعر كاش بالريال'],
                    'max_monthly_installment' => ['type' => 'NUMBER', 'description' => 'أعلى قسط شهري يناسب العميل بالريال'],
                    'min_year' => ['type' => 'INTEGER', 'description' => 'أقدم سنة صنع مقبولة'],
                    'sort' => ['type' => 'STRING', 'enum' => ['best_match', 'price_asc', 'price_desc', 'installment_asc', 'newest']],
                ],
            ],
        ];
    }

    public function handle(array $args, ToolContext $context): ToolResult
    {
        $query = Car::query()
            ->with(['brand', 'category', 'images', 'activeOffers'])
            ->where('is_active', true)
            ->where(fn (Builder $q) => $q->whereNull('availability_status')->orWhere('availability_status', '!=', 'out_of_stock'));

        if ($text = trim((string) ($args['query'] ?? ''))) {
            $query->where(fn (Builder $q) => $q->where('name->ar', 'like', "%{$text}%")
                ->orWhere('name->en', 'like', "%{$text}%")
                ->orWhere('model', 'like', "%{$text}%"));
        }

        if ($brand = trim((string) ($args['brand'] ?? ''))) {
            $query->whereHas('brand', fn (Builder $q) => $q->where('slug', 'like', "%{$brand}%")
                ->orWhere('name->ar', 'like', "%{$brand}%")
                ->orWhere('name->en', 'like', "%{$brand}%"));
        }

        if ($type = trim((string) ($args['body_type'] ?? ''))) {
            $query->where(fn (Builder $q) => $q->where('type', $type)
                ->orWhereHas('category', fn (Builder $c) => $c->where('slug', $type)));
        }

        if (! empty($args['fuel'])) {
            $query->where('specs->fuel', $args['fuel']);
        }
        if (! empty($args['max_cash_price'])) {
            $query->where('cash_price', '<=', (float) $args['max_cash_price']);
        }
        if (! empty($args['min_cash_price'])) {
            $query->where('cash_price', '>=', (float) $args['min_cash_price']);
        }
        if (! empty($args['max_monthly_installment'])) {
            $query->where('min_installment', '>', 0)->where('min_installment', '<=', (float) $args['max_monthly_installment']);
        }
        if (! empty($args['min_year'])) {
            $query->where('year', '>=', (int) $args['min_year']);
        }

        match ($args['sort'] ?? 'best_match') {
            'price_asc' => $query->orderBy('cash_price'),
            'price_desc' => $query->orderByDesc('cash_price'),
            'installment_asc' => $query->orderBy('min_installment'),
            'newest' => $query->orderByDesc('year')->latest('id'),
            default => $query->orderByDesc('is_featured')->orderByDesc('year')->latest('id'),
        };

        $total = (clone $query)->count();
        $cars = $query->limit($context->maxResults())->get()
            ->map(fn (Car $car) => CarSummary::from($car, $context->showPrices()))
            ->all();

        if ($cars === []) {
            return new ToolResult(['total_matches' => 0, 'cars' => [], 'note' => 'لا توجد سيارات مطابقة. اقترح على العميل توسيع الميزانية أو تغيير المواصفات، أو طلب سيارة مخصصة.']);
        }

        return new ToolResult(
            ['total_matches' => $total, 'cars' => $cars],
            ['type' => 'cars', 'cars' => $cars],
        );
    }
}
