<?php

declare(strict_types=1);

namespace App\Services\Reports\Sections;

use App\Services\AttributionHelper;
use App\Services\Reports\ReportFilters;
use App\Services\Reports\ReportMetrics;
use App\Services\Reports\ReportSection;
use Illuminate\Database\Eloquent\Builder;

/**
 * Platforms (Meta, Snapchat, TikTok, Google...) and campaigns.
 *
 * Grouped in SQL by the stored marketing_channel. Older rows without it are grouped by
 * their attribution columns (click ids collapsed to their type) and resolved in PHP per group,
 * so the work is proportional to distinct sources, not to rows.
 */
class ChannelsSection extends ReportSection
{
    private const CLICK_TYPES = ['gclid', 'wbraid', 'gbraid', 'fbclid', 'sc_clickid', 'sccid', 'ttclid', 'twclid'];

    public function key(): string
    {
        return 'channels';
    }

    public function label(): string
    {
        return 'المنصات والحملات';
    }

    public function icon(): string
    {
        return 'target';
    }

    public function order(): int
    {
        return 50;
    }

    public function kpiDefinitions(): array
    {
        return [
            'paid_share' => ['label' => 'طلبات من الإعلانات', 'format' => 'percent', 'hint' => 'Meta / سناب / تيك توك / جوجل Ads / X / يوتيوب'],
            'campaigns' => ['label' => 'حملات نشطة', 'format' => 'number'],
        ];
    }

    public function kpiValues(ReportFilters $filters): array
    {
        $channels = $this->bookingChannels($filters);
        $total = array_sum(array_column($channels, 'total'));
        $paid = array_sum(array_map(fn (array $row) => $row['total'], array_filter($channels, fn (array $row, string $name) => $this->isPaid($name), ARRAY_FILTER_USE_BOTH)));

        return [
            'paid_share' => ReportMetrics::rate($paid, $total),
            'campaigns' => (int) $filters->bookings()->whereNotNull('bookings.utm_campaign')->where('bookings.utm_campaign', '!=', '')->distinct()->count('bookings.utm_campaign'),
        ];
    }

    public function details(ReportFilters $filters): array
    {
        $bookings = $this->bookingChannels($filters);
        $leads = $this->leadChannels($filters);

        $rows = [];
        foreach (array_unique([...array_keys($bookings), ...array_keys($leads)]) as $name) {
            $cells = $this->bookingCells((object) ($bookings[$name] ?? []));
            $leadCount = (int) ($leads[$name] ?? 0);
            $rows[] = ['channel' => $name, 'leads' => $leadCount, ...$cells, 'lead_to_booking' => ReportMetrics::rate($cells['bookings'], $leadCount)];
        }
        usort($rows, fn (array $a, array $b) => [$b['bookings'], $b['leads']] <=> [$a['bookings'], $a['leads']]);

        return [
            'charts' => [
                $this->chart('channels', 'الطلبات والمكسوب لكل منصة', 'bar', [['key' => 'bookings', 'label' => 'طلبات'], ['key' => 'won', 'label' => 'مكسوب']],
                    array_map(fn (array $row) => ['label' => $row['channel'], 'values' => ['bookings' => $row['bookings'], 'won' => $row['won']]], array_slice($rows, 0, 12))),
            ],
            'tables' => [
                $this->table('channels', 'أداء المنصات', [
                    ['key' => 'channel', 'label' => 'المنصة'],
                    ['key' => 'leads', 'label' => 'العملاء', 'format' => 'number'],
                    ...$this->bookingColumns(),
                    ['key' => 'lead_to_booking', 'label' => 'تحويل العميل لطلب', 'format' => 'percent'],
                ], $rows),
                $this->table('campaigns', 'الحملات (utm_campaign)', [
                    ['key' => 'campaign', 'label' => 'الحملة'],
                    ['key' => 'leads', 'label' => 'العملاء', 'format' => 'number'],
                    ...$this->bookingColumns(),
                ], $this->campaigns($filters), 'أعلى 50 حملة'),
            ],
        ];
    }

    /**
     * @return array<string, array{total: int, won: int, lost: int, commission: float}>
     */
    private function bookingChannels(ReportFilters $filters): array
    {
        $result = [];
        $add = function (string $name, object $row) use (&$result): void {
            $result[$name] ??= ['total' => 0, 'won' => 0, 'lost' => 0, 'commission' => 0.0];
            $result[$name]['total'] += (int) $row->total;
            $result[$name]['won'] += (int) $row->won;
            $result[$name]['lost'] += (int) $row->lost;
            $result[$name]['commission'] += (float) $row->commission;
        };

        $this->withChannel($filters->bookings(), 'bookings')->toBase()
            ->selectRaw('bookings.marketing_channel as channel, '.ReportMetrics::bookingAggregates())
            ->groupBy('bookings.marketing_channel')
            ->get()
            ->each(fn (object $row) => $add((string) $row->channel, $row));

        $click = $this->clickType('bookings.click_id');
        $this->withoutChannel($filters->bookings(), 'bookings')->toBase()
            ->selectRaw("bookings.utm_source, bookings.utm_medium, bookings.referrer, bookings.source, {$click} as click_type, ".ReportMetrics::bookingAggregates())
            ->groupBy('bookings.utm_source', 'bookings.utm_medium', 'bookings.referrer', 'bookings.source')
            ->groupByRaw($click)
            ->get()
            ->each(fn (object $row) => $add(AttributionHelper::resolveChannel($row->utm_source, $row->utm_medium, $row->referrer, $row->click_type, $row->source), $row));

        return $result;
    }

    /**
     * @return array<string, int>
     */
    private function leadChannels(ReportFilters $filters): array
    {
        $result = [];

        $this->withChannel($filters->leads(), 'leads')->toBase()
            ->selectRaw('leads.marketing_channel as channel, count(*) as total')
            ->groupBy('leads.marketing_channel')
            ->get()
            ->each(function (object $row) use (&$result) {
                $result[(string) $row->channel] = ($result[(string) $row->channel] ?? 0) + (int) $row->total;
            });

        $click = $this->clickType('leads.click_id');
        $this->withoutChannel($filters->leads(), 'leads')->toBase()
            ->selectRaw("leads.utm_source, leads.utm_medium, leads.referrer, {$click} as click_type, count(*) as total")
            ->groupBy('leads.utm_source', 'leads.utm_medium', 'leads.referrer')
            ->groupByRaw($click)
            ->get()
            ->each(function (object $row) use (&$result) {
                $name = AttributionHelper::resolveChannel($row->utm_source, $row->utm_medium, $row->referrer, $row->click_type);
                $result[$name] = ($result[$name] ?? 0) + (int) $row->total;
            });

        return $result;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function campaigns(ReportFilters $filters): array
    {
        $bookings = $filters->bookings()->whereNotNull('bookings.utm_campaign')->where('bookings.utm_campaign', '!=', '')->toBase()
            ->selectRaw('bookings.utm_campaign as campaign, '.ReportMetrics::bookingAggregates())
            ->groupBy('bookings.utm_campaign')
            ->orderByDesc('total')
            ->limit(50)
            ->get();

        $leads = $filters->leads()->whereIn('leads.utm_campaign', $bookings->pluck('campaign'))->toBase()
            ->selectRaw('leads.utm_campaign as campaign, count(*) as total')
            ->groupBy('leads.utm_campaign')
            ->pluck('total', 'campaign');

        return $bookings->map(fn (object $row) => [
            'campaign' => (string) $row->campaign,
            'leads' => (int) ($leads[$row->campaign] ?? 0),
            ...$this->bookingCells($row),
        ])->all();
    }

    private function isPaid(string $channel): bool
    {
        foreach (['Meta', 'Snapchat', 'TikTok', 'Google Ads', 'Twitter', 'YouTube'] as $paid) {
            if (str_contains($channel, $paid)) {
                return true;
            }
        }

        return false;
    }

    private function withChannel(Builder $query, string $table): Builder
    {
        return $query->whereNotNull("{$table}.marketing_channel")->where("{$table}.marketing_channel", '!=', '');
    }

    private function withoutChannel(Builder $query, string $table): Builder
    {
        return $query->where(fn (Builder $q) => $q->whereNull("{$table}.marketing_channel")->orWhere("{$table}.marketing_channel", ''));
    }

    /** Click ids are unique per visit; only their type matters for the channel. */
    private function clickType(string $column): string
    {
        $cases = implode(' ', array_map(fn (string $type) => "when lower({$column}) like '%{$type}%' then '{$type}'", self::CLICK_TYPES));

        return "case when lower({$column}) like 'fb.%' then 'fbclid' {$cases} else null end";
    }
}
