<?php

declare(strict_types=1);

namespace App\Services\Reports;

use App\Models\Employee;
use App\Services\Reports\Sections\BrandsSection;
use App\Services\Reports\Sections\CarsSection;
use App\Services\Reports\Sections\ChannelsSection;
use App\Services\Reports\Sections\CrmSection;
use App\Services\Reports\Sections\OverviewSection;
use App\Services\Reports\Sections\TeamSection;
use App\Services\Reports\Sections\TrendSection;

/**
 * Report sections of the admin reports page. Modules add theirs from their
 * service provider: app(ReportRegistry::class)->register(MySection::class).
 * A disabled module's provider is never registered, so its section disappears.
 */
class ReportRegistry
{
    /** @var array<string, class-string<ReportSection>> */
    private array $classes = [];

    /** @var array<string, ReportSection>|null */
    private ?array $resolved = null;

    public function __construct()
    {
        foreach ([OverviewSection::class, TeamSection::class, CarsSection::class, BrandsSection::class, ChannelsSection::class, CrmSection::class, TrendSection::class] as $class) {
            $this->register($class);
        }
    }

    /**
     * @param  class-string<ReportSection>  $class
     */
    public function register(string $class): void
    {
        $this->classes[$class] = $class;
        $this->resolved = null;
    }

    /**
     * @return array<string, ReportSection> keyed by section key, in display order
     */
    public function all(): array
    {
        if ($this->resolved === null) {
            $sections = array_map(fn (string $class) => app($class), array_values($this->classes));
            usort($sections, fn (ReportSection $a, ReportSection $b) => $a->order() <=> $b->order());

            $this->resolved = [];
            foreach ($sections as $section) {
                $this->resolved[$section->key()] = $section;
            }
        }

        return $this->resolved;
    }

    /**
     * @return array<string, ReportSection>
     */
    public function visibleTo(Employee $employee, bool $canViewAll): array
    {
        return array_filter($this->all(), fn (ReportSection $section) => $section->visibleTo($employee, $canViewAll));
    }

    public function find(string $key): ?ReportSection
    {
        return $this->all()[$key] ?? null;
    }
}
