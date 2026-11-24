<?php

declare(strict_types=1);

namespace App\Modules\AiAssistant\Tools;

use App\Models\Offer;

class ListOffersTool implements AssistantTool
{
    public function name(): string
    {
        return 'list_offers';
    }

    public function declaration(): array
    {
        return [
            'name' => $this->name(),
            'description' => 'العروض والتخفيضات السارية حالياً في المعرض والسيارات المشمولة.',
        ];
    }

    public function handle(array $args, ToolContext $context): ToolResult
    {
        $offers = Offer::query()->active()->with(['cars.brand'])->latest('id')->limit(6)->get()
            ->map(fn (Offer $offer) => array_filter([
                'title' => $offer->title,
                'description' => $offer->description ? mb_substr(strip_tags((string) $offer->description), 0, 200) : null,
                'discount_percent' => $offer->discount_percent,
                'special_price' => $context->showPrices() ? $offer->special_price : null,
                'special_installment' => $context->showPrices() ? $offer->special_installment : null,
                'ends_at' => $offer->ends_at?->toDateString(),
                'cars' => $offer->cars->map(fn ($car) => ['slug' => $car->slug, 'name' => $car->name])->take(5)->values()->all(),
            ]))
            ->values()
            ->all();

        return new ToolResult($offers === [] ? ['offers' => [], 'note' => 'لا توجد عروض سارية حالياً.'] : ['offers' => $offers]);
    }
}
