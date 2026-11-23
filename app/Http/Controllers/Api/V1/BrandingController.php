<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Api\Contracts\ApiResponse;
use App\Http\Controllers\Api\ApiBaseController;
use App\Models\Company;
use App\Models\CompanyBranding;
use App\Models\Setting;
use Illuminate\Http\Request;

class BrandingController extends ApiBaseController
{
    private const HEX_PATTERN = '/^#[0-9A-Fa-f]{6}$/';

    private const DEFAULTS = [
        'primary_color' => '#002F29',
        'primary_hover_color' => '#001F1B',
        'secondary_color' => '#D5F500',
        'accent_color' => '#D5F500',
        'sidebar_bg_color' => '#002F29',
    ];

    public function show(Request $request): ApiResponse
    {
        $company = Company::where('is_active', true)->first();

        $branding = $company
            ? CompanyBranding::where('company_id', $company->id)
                ->where('is_active', true)
                ->latest()
                ->first()
            : null;

        $logoUrl = asset('images/logo.png');
        if ($branding?->logo_path) {
            $logoUrl = str_starts_with($branding->logo_path, 'images/') || str_starts_with($branding->logo_path, 'http')
                ? asset($branding->logo_path)
                : asset('storage/'.$branding->logo_path);
        }

        $settings = Setting::whereIn('key', [
            'theme_child_enabled',
            'theme_child_primary_color',
            'theme_child_secondary_color',
            'theme_child_accent_color',
            'theme_child_sidebar_bg_color',
            'theme_child_border_radius',
            'theme_child_custom_css',
            'theme_child_target_scope',
            'theme_safe_mode',
        ])->pluck('value', 'key');

        return $this->respondSuccess([
            'company_name' => $company?->name ?? 'Tameed',
            'logo_url' => $logoUrl,
            'primary_color' => $this->resolveColor($branding?->primary_color, 'primary_color'),
            'primary_hover_color' => $this->resolveColor($branding?->primary_hover_color, 'primary_hover_color'),
            'secondary_color' => $this->resolveColor($branding?->secondary_color, 'secondary_color'),
            'accent_color' => $this->resolveColor($branding?->accent_color, 'accent_color'),
            'sidebar_bg_color' => $this->resolveColor($branding?->sidebar_bg_color, 'sidebar_bg_color'),
            'safe_mode' => (bool) ($settings['theme_safe_mode'] ?? false),
            'child_theme' => [
                'enabled' => (bool) ($settings['theme_child_enabled'] ?? false),
                'primary_color' => $settings['theme_child_primary_color'] ?? null,
                'secondary_color' => $settings['theme_child_secondary_color'] ?? null,
                'accent_color' => $settings['theme_child_accent_color'] ?? null,
                'sidebar_bg_color' => $settings['theme_child_sidebar_bg_color'] ?? null,
                'border_radius' => $settings['theme_child_border_radius'] ?? '12px',
                'custom_css' => $settings['theme_child_custom_css'] ?? '',
                'target_scope' => $settings['theme_child_target_scope'] ?? 'both',
            ],
        ], 'Branding retrieved successfully');
    }

    private function resolveColor(?string $value, string $key): string
    {
        if ($value !== null && preg_match(self::HEX_PATTERN, $value)) {
            return $value;
        }

        return self::DEFAULTS[$key];
    }
}
