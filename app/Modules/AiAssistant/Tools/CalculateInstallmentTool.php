<?php

declare(strict_types=1);

namespace App\Modules\AiAssistant\Tools;

use App\Models\CalculatorBank;
use App\Models\Car;
use App\Services\Api\Store\Helpers\SlugResolver;
use App\Services\CalculatorService;

class CalculateInstallmentTool implements AssistantTool
{
    /** Typical Saudi debt-burden ratio used for the indicative eligibility check. */
    private const DEBT_BURDEN_RATIO = 0.33;

    private const TERMS = [12, 24, 36, 48, 60, 72, 84];

    public function __construct(private readonly CalculatorService $calculator) {}

    public function name(): string
    {
        return 'calculate_installment';
    }

    public function declaration(): array
    {
        return [
            'name' => $this->name(),
            'description' => 'احسب القسط الشهري التقديري لسيارة من المعرض بنسب البنوك المعتمدة لدى المعرض، مع فحص تقديري لمناسبة القسط للراتب.',
            'parameters' => [
                'type' => 'OBJECT',
                'properties' => [
                    'slug' => ['type' => 'STRING', 'description' => 'معرّف السيارة (slug)'],
                    'down_payment' => ['type' => 'NUMBER', 'description' => 'الدفعة الأولى بالريال (0 لو بدون دفعة)'],
                    'months' => ['type' => 'INTEGER', 'description' => 'مدة التمويل بالأشهر (12 إلى 84)'],
                    'bank' => ['type' => 'STRING', 'description' => 'اسم البنك إن حدده العميل (اختياري)'],
                    'salary' => ['type' => 'NUMBER', 'description' => 'الراتب الشهري للعميل إن ذكره (اختياري)'],
                    'monthly_obligations' => ['type' => 'NUMBER', 'description' => 'الالتزامات الشهرية الحالية إن ذكرها (اختياري)'],
                ],
                'required' => ['slug'],
            ],
        ];
    }

    public function handle(array $args, ToolContext $context): ToolResult
    {
        if (! $context->showPrices()) {
            return ToolResult::error('عرض الأسعار والأقساط متوقف في إعدادات المعرض. اطلب من العميل التواصل مع المبيعات.');
        }

        $query = Car::query()->with(['activeOffers'])->where('is_active', true);
        SlugResolver::applyCarSlug($query, (string) ($args['slug'] ?? ''));
        $car = $query->first();
        if (! $car) {
            return ToolResult::error('السيارة غير موجودة.');
        }

        $price = (float) ($car->activeOffers->first()?->special_price ?: $car->cash_price);
        $downPayment = max(0.0, min($price, (float) ($args['down_payment'] ?? 0)));
        $months = $this->nearestTerm((int) ($args['months'] ?? 60));
        $downPercent = $price > 0 ? ($downPayment / $price) * 100 : 0;

        $banks = CalculatorBank::query()->where('is_active', true)->orderBy('sort_order')->get();
        if ($bankName = trim((string) ($args['bank'] ?? ''))) {
            $matched = $banks->filter(fn (CalculatorBank $bank) => str_contains(mb_strtolower((string) $bank->name), mb_strtolower($bankName)));
            $banks = $matched->isNotEmpty() ? $matched : $banks;
        }
        if ($banks->isEmpty()) {
            return ToolResult::error('لا توجد بنوك مفعّلة في حاسبة المعرض.');
        }

        $options = $banks->map(function (CalculatorBank $bank) use ($price, $downPercent, $months) {
            $result = $this->calculator->installment($price, $downPercent, $months, $this->calculator->clampAnnualRate((float) $bank->annual_rate));

            return [
                'bank' => (string) $bank->name,
                'annual_rate' => (float) $bank->annual_rate,
                'monthly' => round($result['monthly']),
                'total' => round($result['total']),
            ];
        })->sortBy('monthly')->values();

        $best = $options->first();
        $data = [
            'car' => $car->name,
            'slug' => $car->slug,
            'price' => $price,
            'down_payment' => $downPayment,
            'months' => $months,
            'best_option' => $best,
            'other_options' => $options->slice(1, 3)->values()->all(),
            'disclaimer' => (string) $context->settings->get('finance_disclaimer'),
        ];

        if (! empty($args['salary'])) {
            $salary = (float) $args['salary'];
            $obligations = (float) ($args['monthly_obligations'] ?? 0);
            $maxInstallment = max(0, $salary * self::DEBT_BURDEN_RATIO - $obligations);
            $data['eligibility'] = [
                'max_affordable_installment' => round($maxInstallment),
                'fits_salary' => $best['monthly'] <= $maxInstallment,
                'note' => 'فحص تقديري بنسبة استقطاع 33% من الراتب، القرار النهائي للبنك.',
            ];
        }

        return new ToolResult($data, ['type' => 'installment'] + $data);
    }

    private function nearestTerm(int $months): int
    {
        return collect(self::TERMS)->sortBy(fn (int $term) => abs($term - $months))->first();
    }
}
