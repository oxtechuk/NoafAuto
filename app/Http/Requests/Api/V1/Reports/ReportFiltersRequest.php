<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Reports;

use App\Http\Requests\Api\ApiBaseRequest;
use App\Models\Booking;
use App\Models\Employee;
use App\Services\Reports\ReportFilters;
use Carbon\CarbonImmutable;

final class ReportFiltersRequest extends ApiBaseRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
            'all' => ['nullable', 'boolean'],
            'employee_id' => ['nullable', 'integer', 'exists:employees,id'],
            'brand_id' => ['nullable', 'integer', 'exists:brands,id'],
            'compare' => ['nullable', 'boolean'],
            'fresh' => ['nullable', 'boolean'],
            'table' => ['nullable', 'string', 'max:50'],
        ];
    }

    /**
     * Default: the last 30 days. Viewers without the full report always get their own numbers only.
     */
    public function toFilters(Employee $viewer, bool $canViewAll): ReportFilters
    {
        $to = $this->filled('to') ? CarbonImmutable::parse((string) $this->input('to')) : CarbonImmutable::today();

        if ($this->boolean('all')) {
            $first = Booking::query()->min('created_at');
            $from = $first ? CarbonImmutable::parse($first) : $to->subDays(29);
        } else {
            $from = $this->filled('from') ? CarbonImmutable::parse((string) $this->input('from')) : $to->subDays(29);
        }

        return new ReportFilters(
            $from->startOfDay(),
            $to->endOfDay(),
            $canViewAll ? ($this->integer('employee_id') ?: null) : $viewer->id,
            $this->integer('brand_id') ?: null,
            ! $canViewAll,
        );
    }
}
