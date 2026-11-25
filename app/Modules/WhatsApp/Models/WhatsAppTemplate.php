<?php

declare(strict_types=1);

namespace App\Modules\WhatsApp\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Message template synced from the showroom's WhatsApp Business account (Meta).
 */
class WhatsAppTemplate extends Model
{
    /** Meta's template categories (key => Arabic label). */
    public const CATEGORIES = ['marketing' => 'تسويق', 'utility' => 'خدمة / تحديثات', 'authentication' => 'تحقق (OTP)'];

    protected $table = 'wa_templates';

    protected $fillable = ['provider_template_id', 'name', 'language', 'category', 'status', 'rejected_reason', 'components', 'synced_at'];

    protected $casts = [
        'components' => 'array',
        'synced_at' => 'datetime',
    ];

    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    /** Text of the BODY component, with its {{n}} placeholders. */
    public function bodyText(): ?string
    {
        foreach ((array) $this->components as $component) {
            if (strtoupper((string) ($component['type'] ?? '')) === 'BODY') {
                return $component['text'] ?? null;
            }
        }

        return null;
    }

    /** Number of {{n}} placeholders in the body. */
    public function bodyParameterCount(): int
    {
        preg_match_all('/\{\{\s*(\d+)\s*\}\}/', (string) $this->bodyText(), $matches);

        return count(array_unique($matches[1]));
    }

    /**
     * @return array<string, mixed>
     */
    public function toPayload(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'language' => $this->language,
            'category' => $this->category,
            'category_label' => self::CATEGORIES[$this->category] ?? $this->category,
            'status' => $this->status,
            'rejected_reason' => $this->rejected_reason,
            'body' => $this->bodyText(),
            'parameters' => $this->bodyParameterCount(),
            'synced_at' => $this->synced_at?->toIso8601String(),
        ];
    }
}
