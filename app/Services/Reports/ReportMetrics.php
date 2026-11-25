<?php

declare(strict_types=1);

namespace App\Services\Reports;

use App\Models\Booking;
use Illuminate\Support\Facades\DB;

/**
 * One definition of "won", "lost" and the rates for every report, plus the few
 * SQL snippets that differ between MySQL (production) and SQLite (tests).
 */
final class ReportMetrics
{
    /** Old statuses still present in older rows. */
    private const LEGACY_WON = ['sold', 'done'];

    private const LEGACY_LOST = ['rejected'];

    /**
     * @return list<string>
     */
    public static function wonStatuses(): array
    {
        $flagged = array_keys(array_filter(Booking::STATUSES, fn (array $status) => ($status['is_won'] ?? false) === true));

        return array_values(array_unique([...$flagged, ...self::LEGACY_WON]));
    }

    /**
     * @return list<string>
     */
    public static function lostStatuses(): array
    {
        $flagged = array_keys(array_filter(Booking::STATUSES, fn (array $status) => ($status['is_lost'] ?? false) === true));

        return array_values(array_unique([...$flagged, ...self::LEGACY_LOST]));
    }

    /** SQL condition "column in (...)" for won bookings. */
    public static function isWon(string $column = 'bookings.status'): string
    {
        return self::in($column, self::wonStatuses());
    }

    public static function isLost(string $column = 'bookings.status'): string
    {
        return self::in($column, self::lostStatuses());
    }

    /**
     * Standard booking aggregate columns: total, won, lost, commission.
     */
    public static function bookingAggregates(): string
    {
        $won = self::isWon();
        $lost = self::isLost();

        return 'count(*) as total, '
            ."sum(case when {$won} then 1 else 0 end) as won, "
            ."sum(case when {$lost} then 1 else 0 end) as lost, "
            ."sum(case when {$won} then coalesce(bookings.net_commission, 0) else 0 end) as commission";
    }

    /**
     * Win rate = won / (won + lost): open bookings don't drag the rate down.
     */
    public static function winRate(int|float $won, int|float $lost): ?float
    {
        return self::rate($won, $won + $lost);
    }

    public static function rate(int|float $part, int|float $whole): ?float
    {
        return $whole > 0 ? round($part / $whole * 100, 1) : null;
    }

    /** Days between two datetime columns. */
    public static function daysBetween(string $start, string $end): string
    {
        return match (DB::connection()->getDriverName()) {
            'sqlite' => "(julianday({$end}) - julianday({$start}))",
            'pgsql' => "(extract(epoch from ({$end} - {$start})) / 86400)",
            default => "(timestampdiff(second, {$start}, {$end}) / 86400)",
        };
    }

    /** "YYYY-MM" of a datetime column. */
    public static function month(string $column): string
    {
        return match (DB::connection()->getDriverName()) {
            'sqlite' => "strftime('%Y-%m', {$column})",
            'pgsql' => "to_char({$column}, 'YYYY-MM')",
            default => "date_format({$column}, '%Y-%m')",
        };
    }

    /** "YYYY-MM-DD" of a datetime column (date() is portable). */
    public static function day(string $column): string
    {
        return "date({$column})";
    }

    /**
     * @param  list<string>  $values
     */
    private static function in(string $column, array $values): string
    {
        $pdo = DB::connection()->getPdo();

        return $column.' in ('.implode(', ', array_map(fn (string $value) => $pdo->quote($value), $values)).')';
    }
}
