<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Api\Contracts\ApiResponse;
use App\Http\Controllers\Api\ApiBaseController;
use App\Http\Requests\Api\V1\Reports\ReportFiltersRequest;
use App\Models\Booking;
use App\Models\Brand;
use App\Models\Employee;
use App\Models\Lead;
use App\Services\AttributionHelper;
use App\Services\Reports\ReportFilters;
use App\Services\Reports\ReportMetrics;
use App\Services\Reports\ReportRegistry;
use App\Services\Reports\ReportSection;
use App\Services\Reports\ReportService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends ApiBaseController
{
    public function bookings(Request $request): ApiResponse
    {
        $this->authorizeReports($request);

        $from = $request->input('from', now()->subMonth()->toDateString());
        $to = $request->input('to', now()->toDateString());

        $base = Booking::query()
            ->whereDate('created_at', '>=', $from)
            ->whereDate('created_at', '<=', $to);

        $won = ReportMetrics::isWon('status');
        $totals = (clone $base)->toBase()->selectRaw("count(*) as total,
            sum(case when {$won} then 1 else 0 end) as sold,
            sum(case when {$won} then coalesce(net_commission, 0) else 0 end) as commission,
            sum(case when {$won} then coalesce(down_payment, 0) else 0 end) as down_payment,
            sum(case when {$won} then monthly_installment * (duration_years * 12) else 0 end) as remaining")->first();

        $financial = [
            'total_bookings' => (int) ($totals->total ?? 0),
            'total_sold' => (int) ($totals->sold ?? 0),
            'total_commission' => (float) ($totals->commission ?? 0),
            'total_down_payment' => (float) ($totals->down_payment ?? 0),
            'total_remaining' => (float) ($totals->remaining ?? 0),
        ];

        $employees = (clone $base)->whereNotNull('assigned_to')
            ->selectRaw('assigned_to, count(*) as total_bookings, sum(case when status in (\'sold\', \'received\') then 1 else 0 end) as total_sold, sum(case when status in (\'sold\', \'received\') then net_commission else 0 end) as total_commission')
            ->groupBy('assigned_to')
            ->with('employee:id,name,email')
            ->get();

        $topCars = (clone $base)->whereNotNull('car_id')
            ->selectRaw('car_id, count(*) as total_bookings, sum(case when status in (\'sold\', \'received\') then 1 else 0 end) as total_sold')
            ->groupBy('car_id')
            ->orderByDesc('total_bookings')
            ->take(5)
            ->with(['car' => fn ($q) => $q->select('id', 'name', 'brand_id')->with('brand:id,name')])
            ->get()
            ->map(function ($row) {
                $carName = $row->car?->name;
                $carNameResolved = is_array($carName)
                    ? ($carName[app()->getLocale()] ?? $carName['ar'] ?? $carName['en'] ?? '')
                    : (string) ($carName ?? '');

                $brandName = $row->car?->brand?->name;
                $brandNameResolved = is_array($brandName)
                    ? ($brandName[app()->getLocale()] ?? $brandName['ar'] ?? $brandName['en'] ?? '')
                    : (string) ($brandName ?? '');

                return [
                    'car_id' => $row->car_id,
                    'total_bookings' => (int) $row->total_bookings,
                    'total_sold' => (int) $row->total_sold,
                    'car' => [
                        'id' => $row->car?->id,
                        'name' => $carNameResolved ?: ('سيارة #'.$row->car_id),
                        'brand' => [
                            'id' => $row->car?->brand?->id,
                            'name' => $brandNameResolved ?: 'ماركة معتمدة',
                        ],
                    ],
                ];
            });

        $installments = [
            'avg_down_payment' => (float) ((clone $base)->where('down_payment', '>', 0)->avg('down_payment') ?? 0),
            'avg_duration' => (float) ((clone $base)->where('duration_years', '>', 0)->avg('duration_years') ?? 0),
            'avg_monthly' => (float) ((clone $base)->where('monthly_installment', '>', 0)->avg('monthly_installment') ?? 0),
        ];

        $sources = (clone $base)->whereNotNull('source')
            ->selectRaw('source, count(*) as total_bookings, sum(case when status in (\'sold\', \'received\') then 1 else 0 end) as total_sold, sum(case when status = \'rejected\' or status like \'lost_%\' then 1 else 0 end) as total_lost')
            ->groupBy('source')
            ->orderByDesc('total_bookings')
            ->get();

        return $this->respondSuccess([
            'from' => $from,
            'to' => $to,
            'financial' => $financial,
            'employees' => $employees,
            'top_cars' => $topCars,
            'installments' => $installments,
            'sources' => $sources,
        ], 'Booking reports retrieved successfully');
    }

    public function sources(Request $request): ApiResponse
    {
        $this->authorizeReports($request);

        $from = $request->input('from', now()->startOfMonth()->toDateString());
        $to = $request->input('to', today()->toDateString());

        $bookings = Booking::query()
            ->whereDate('created_at', '>=', $from)
            ->whereDate('created_at', '<=', $to)
            ->get(['id', 'status', 'utm_source', 'utm_medium', 'referrer', 'click_id', 'source', 'net_commission']);

        $leads = Lead::query()
            ->whereDate('created_at', '>=', $from)
            ->whereDate('created_at', '<=', $to)
            ->get(['id', 'status', 'utm_source', 'utm_medium', 'referrer', 'click_id']);

        $channels = [];

        foreach ($leads as $lead) {
            $ch = AttributionHelper::resolveChannel(
                $lead->utm_source,
                $lead->utm_medium,
                $lead->referrer,
                $lead->click_id
            );
            $channels[$ch]['leads_count'] = ($channels[$ch]['leads_count'] ?? 0) + 1;
        }

        foreach ($bookings as $b) {
            $ch = AttributionHelper::resolveChannel(
                $b->utm_source,
                $b->utm_medium,
                $b->referrer,
                $b->click_id,
                $b->source
            );
            $channels[$ch]['bookings_count'] = ($channels[$ch]['bookings_count'] ?? 0) + 1;
            if (in_array($b->status, ['sold', 'received'], true)) {
                $channels[$ch]['sold_count'] = ($channels[$ch]['sold_count'] ?? 0) + 1;
                $channels[$ch]['revenue'] = ($channels[$ch]['revenue'] ?? 0) + (float) $b->net_commission;
            }
        }

        $report = [];
        foreach ($channels as $name => $data) {
            $report[] = [
                'channel' => $name,
                'leads_count' => $data['leads_count'] ?? 0,
                'bookings_count' => $data['bookings_count'] ?? 0,
                'sold_count' => $data['sold_count'] ?? 0,
                'revenue' => $data['revenue'] ?? 0,
            ];
        }

        return $this->respondSuccess([
            'from' => $from,
            'to' => $to,
            'channels' => $report,
        ], 'Source attribution report retrieved successfully');
    }

    public function monthly(Request $request): ApiResponse
    {
        $this->authorizeReports($request);

        $start = now()->subMonths(11)->startOfMonth();

        $bookingRows = Booking::query()
            ->where('created_at', '>=', $start)
            ->get(['created_at', 'status', 'net_commission']);

        $leadRows = Lead::query()
            ->where('created_at', '>=', $start)
            ->get(['created_at']);

        $months = [];
        for ($i = 11; $i >= 0; $i--) {
            $m = now()->copy()->subMonths($i)->startOfMonth();
            $key = $m->format('Y-m');
            $months[$key] = [
                'key' => $key,
                'label' => $m->translatedFormat('F Y'),
                'bookings_count' => 0,
                'sold_count' => 0,
                'leads_count' => 0,
                'revenue' => 0.0,
            ];
        }

        foreach ($bookingRows as $b) {
            $key = Carbon::parse($b->created_at)->format('Y-m');
            if (isset($months[$key])) {
                $months[$key]['bookings_count']++;
                if (in_array($b->status, ['sold', 'received'], true)) {
                    $months[$key]['sold_count']++;
                    $months[$key]['revenue'] += (float) ($b->net_commission ?? 0);
                }
            }
        }

        foreach ($leadRows as $l) {
            $key = Carbon::parse($l->created_at)->format('Y-m');
            if (isset($months[$key])) {
                $months[$key]['leads_count']++;
            }
        }

        return $this->respondSuccess([
            'months' => array_values($months),
        ], 'Monthly performance report retrieved successfully');
    }

    /**
     * Report tabs the viewer can open, plus the filter options.
     * Every employee has a report: without "manage-reports" it only covers their own work.
     */
    public function sections(Request $request, ReportRegistry $registry): ApiResponse
    {
        $employee = $this->viewer($request);
        $canViewAll = $this->canViewAll($employee);

        return $this->respondSuccess([
            'can_view_all' => $canViewAll,
            'sections' => array_values(array_map(fn (ReportSection $section) => [
                'key' => $section->key(),
                'label' => $section->label(),
                'icon' => $section->icon(),
            ], $registry->visibleTo($employee, $canViewAll))),
            'employees' => $canViewAll ? Employee::query()->where('is_active', true)->orderBy('name')->get(['id', 'name']) : [],
            'brands' => Brand::query()->orderBy('id')->get(['id', 'name'])->map(fn (Brand $brand) => [
                'id' => $brand->id,
                'name' => $brand->getTranslation('name', 'ar', false) ?: $brand->getTranslation('name', 'en', false),
            ]),
        ], 'Report sections retrieved successfully');
    }

    public function section(ReportFiltersRequest $request, string $section, ReportRegistry $registry, ReportService $reports): ApiResponse
    {
        [$reportSection, $filters] = $this->resolveSection($request, $section, $registry);

        return $this->respondSuccess(
            $reports->run($reportSection, $filters, $request->boolean('compare', true), $request->boolean('fresh')),
            'Report retrieved successfully',
        );
    }

    /**
     * CSV of one table of a section (UTF-8 with BOM so Excel shows Arabic correctly).
     */
    public function export(ReportFiltersRequest $request, string $section, ReportRegistry $registry, ReportService $reports): StreamedResponse
    {
        [$reportSection, $filters] = $this->resolveSection($request, $section, $registry);
        $payload = $reports->run($reportSection, $filters, $request->boolean('compare', true));

        $table = collect($payload['tables'])->firstWhere('key', $request->input('table')) ?? ($payload['tables'][0] ?? null);
        if (! $table) {
            abort(404, 'This report has no table to export.');
        }

        $filename = "report-{$section}-{$table['key']}-{$payload['range']['from']}-{$payload['range']['to']}.csv";

        return response()->streamDownload(function () use ($table) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, array_column($table['columns'], 'label'));
            foreach ($table['rows'] as $row) {
                fputcsv($out, array_map(fn (array $column) => $row[$column['key']] ?? '', $table['columns']));
            }
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /**
     * @return array{0: ReportSection, 1: ReportFilters}
     */
    private function resolveSection(ReportFiltersRequest $request, string $key, ReportRegistry $registry): array
    {
        $employee = $this->viewer($request);
        $canViewAll = $this->canViewAll($employee);

        $section = $registry->find($key);
        if (! $section || ! $section->visibleTo($employee, $canViewAll)) {
            abort(404, 'Report not found');
        }

        return [$section, $request->toFilters($employee, $canViewAll)];
    }

    private function viewer(Request $request): Employee
    {
        /** @var Employee|null $employee */
        $employee = $request->user('employee');
        if (! $employee) {
            abort(401);
        }

        return $employee;
    }

    private function canViewAll(Employee $employee): bool
    {
        return $employee->isAdmin() || $employee->checkPermissionTo('manage-reports', 'employee');
    }

    private function authorizeReports(Request $request): void
    {
        /** @var Employee|null $employee */
        $employee = $request->user('employee');

        if (! $employee || (! $employee->isAdmin() && ! $employee->checkPermissionTo('manage-reports', 'employee'))) {
            abort(403, 'Unauthorized to view reports');
        }
    }
}
