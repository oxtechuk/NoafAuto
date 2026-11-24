<?php

declare(strict_types=1);

namespace App\Modules\AiAssistant\Tools;

use App\Modules\AiAssistant\Services\AssistantSettings;

/**
 * Tools exposed to the model — only those the showroom enabled in the settings.
 */
class ToolRegistry
{
    /** @var array<string, class-string<AssistantTool>> */
    private const TOOLS = [
        'search_cars' => SearchCarsTool::class,
        'get_car' => GetCarTool::class,
        'compare_cars' => CompareCarsTool::class,
        'calculate_installment' => CalculateInstallmentTool::class,
        'list_offers' => ListOffersTool::class,
        'get_showroom_info' => ShowroomInfoTool::class,
        'create_lead' => CreateLeadTool::class,
    ];

    public function __construct(private readonly AssistantSettings $settings) {}

    /**
     * @return array<string, AssistantTool>
     */
    public function enabled(): array
    {
        $tools = [];
        foreach (self::TOOLS as $name => $class) {
            if ($this->settings->toolEnabled($name)) {
                $tools[$name] = app($class);
            }
        }

        return $tools;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function declarations(): array
    {
        return array_values(array_map(fn (AssistantTool $tool) => $tool->declaration(), $this->enabled()));
    }

    public function find(string $name): ?AssistantTool
    {
        return $this->enabled()[$name] ?? null;
    }
}
