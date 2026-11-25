<?php

declare(strict_types=1);

namespace App\Modules\WhatsApp\Services;

use App\Models\Setting;
use App\Modules\WhatsApp\Models\WhatsAppSettingRecord;
use Illuminate\Support\Str;

/**
 * WhatsApp channel configuration owned by the showroom.
 *
 * On first use it imports the legacy CRM settings (twilio_* keys and the two
 * WhatsApp text templates), so existing showrooms keep working unchanged.
 */
class WhatsAppSettings
{
    public const PROVIDERS = ['meta' => 'WhatsApp Business Cloud API (Meta)', 'twilio' => 'Twilio'];

    /** Secret fields per provider (stored encrypted, never returned to the browser). */
    public const SECRET_FIELDS = [
        'twilio' => ['auth_token'],
        'meta' => ['access_token', 'app_secret', 'pin'],
    ];

    /** Meta pricing categories the showroom can price for the cost estimate. */
    public const PRICED_CATEGORIES = ['marketing', 'utility', 'authentication'];

    /** Events the core can notify about, with their placeholders. */
    public const EVENTS = [
        'booking_created' => ['label' => 'عند استلام طلب جديد من المتجر', 'variables' => ['customer_name', 'car_name', 'status']],
        'booking_status_updated' => ['label' => 'عند تغيير حالة الطلب', 'variables' => ['customer_name', 'car_name', 'status']],
        'campaign' => ['label' => 'حملات الواتساب من صفحة العملاء', 'variables' => ['name', 'phone']],
    ];

    private ?WhatsAppSettingRecord $record = null;

    /** @var array<string, mixed>|null */
    private ?array $legacy = null;

    /**
     * @return array<string, mixed>
     */
    public function defaults(): array
    {
        $legacy = $this->legacy();

        $notification = fn (string $text) => [
            'enabled' => true,
            'text' => $text,
            'template_name' => '',
            'template_language' => 'ar',
            'template_params' => ['customer_name', 'car_name', 'status'],
            'twilio_content_sid' => '',
        ];

        return [
            'enabled' => true,
            'provider' => ! empty($legacy['twilio_sid']) ? 'twilio' : 'meta',
            'default_country_code' => '966',
            'twilio' => [
                'account_sid' => (string) ($legacy['twilio_sid'] ?? ''),
                'from_number' => (string) ($legacy['twilio_whatsapp_number'] ?? ''),
                'validate_signature' => true,
            ],
            'meta' => [
                'phone_number_id' => '',
                'business_account_id' => '',
                'graph_version' => 'v23.0',
                'verify_token' => '',
                'connection' => 'manual', // manual | embedded (set by the Embedded Signup flow)
                'connected_at' => '',
            ],
            // Price per billable message in SAR, as on the showroom's Meta invoice (Meta changes rates; 0 = not set).
            'pricing' => [
                'rates' => ['marketing' => 0, 'utility' => 0, 'authentication' => 0],
            ],
            'notifications' => [
                'booking_created' => $notification((string) ($legacy['whatsapp_template_new_lead'] ?? '')),
                'booking_status_updated' => $notification((string) ($legacy['whatsapp_template_status_update'] ?? '')),
                'campaign' => ['enabled' => true, 'text' => '', 'template_name' => '', 'template_language' => 'ar', 'template_params' => ['name'], 'twilio_content_sid' => ''],
            ],
            'inbound' => [
                'create_lead' => true,
                'auto_reply' => 'off', // off | ai | static
                'static_reply' => 'أهلاً بك! وصلت رسالتك وبيتواصل معك أحد موظفينا قريباً.',
                'human_pause_hours' => 12,
            ],
            'inbox' => [
                'auto_assign' => true, // round-robin new conversations to the sales team
                'hide_phone_from_sales' => false, // non-admins see a masked customer number
                'preset_tags' => ['مهتم', 'تمويل', 'كاش', 'متابعة', 'غير جاد'],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function all(): array
    {
        $stored = (array) ($this->record()->data ?? []);
        $settings = array_replace_recursive($this->defaults(), $stored);

        foreach (array_keys(self::EVENTS) as $event) {
            if (isset($stored['notifications'][$event]['template_params'])) {
                $settings['notifications'][$event]['template_params'] = array_values((array) $stored['notifications'][$event]['template_params']);
            }
        }
        // Lists replace the defaults instead of merging index by index.
        if (isset($stored['inbox']['preset_tags'])) {
            $settings['inbox']['preset_tags'] = array_values((array) $stored['inbox']['preset_tags']);
        }

        if ($settings['meta']['verify_token'] === '') {
            $settings['meta']['verify_token'] = $this->ensureVerifyToken();
        }

        return $settings;
    }

    public function get(string $key, mixed $default = null): mixed
    {
        return data_get($this->all(), $key, $default);
    }

    public function provider(): string
    {
        return (string) $this->get('provider', 'meta');
    }

    public function secret(string $provider, string $field): ?string
    {
        if ($provider === 'twilio' && $field === 'auth_token' && ! isset(($this->record()->secrets ?? [])['twilio'])) {
            $legacy = (string) ($this->legacy()['twilio_auth_token'] ?? '');

            return $legacy !== '' ? $legacy : null;
        }

        $value = (string) data_get($this->record()->secrets ?? [], "{$provider}.{$field}", '');

        return $value !== '' ? $value : null;
    }

    /**
     * @param  array<string, mixed>  $values
     * @param  array<string, array<string, string|null>>  $secrets  null = keep, "" = remove
     */
    public function update(array $values, array $secrets = []): void
    {
        $record = $this->record();
        $data = array_replace_recursive((array) ($record->data ?? []), $values);
        foreach (array_keys(self::EVENTS) as $event) {
            if (isset($values['notifications'][$event]['template_params'])) {
                $data['notifications'][$event]['template_params'] = array_values((array) $values['notifications'][$event]['template_params']);
            }
        }
        if (isset($values['inbox']['preset_tags'])) {
            $data['inbox']['preset_tags'] = array_values((array) $values['inbox']['preset_tags']);
        }
        $record->data = $data;

        $stored = (array) ($record->secrets ?? []);
        foreach ($secrets as $provider => $fields) {
            foreach ((array) $fields as $field => $value) {
                if ($value === null || ! in_array($field, self::SECRET_FIELDS[$provider] ?? [], true)) {
                    continue;
                }
                $stored[$provider][$field] = $value;
            }
        }
        $record->secrets = $stored;
        $record->save();
        $this->record = $record;
    }

    /**
     * Masked view of the secrets for the admin UI.
     *
     * @return array<string, array<string, array{configured: bool, masked: ?string}>>
     */
    public function secretStatus(): array
    {
        $status = [];
        foreach (self::SECRET_FIELDS as $provider => $fields) {
            foreach ($fields as $field) {
                $value = $this->secret($provider, $field);
                $status[$provider][$field] = ['configured' => $value !== null, 'masked' => $value !== null ? '••••'.substr($value, -4) : null];
            }
        }

        return $status;
    }

    /** All credentials of the selected provider are present. */
    public function isConfigured(): bool
    {
        if (! $this->get('enabled')) {
            return false;
        }

        return match ($this->provider()) {
            'twilio' => $this->get('twilio.account_sid') !== '' && $this->get('twilio.from_number') !== '' && $this->secret('twilio', 'auth_token') !== null,
            'meta' => $this->get('meta.phone_number_id') !== '' && $this->secret('meta', 'access_token') !== null,
            default => false,
        };
    }

    public function fresh(): self
    {
        $this->record = null;
        $this->legacy = null;

        return $this;
    }

    private function ensureVerifyToken(): string
    {
        $token = Str::random(40);
        $record = $this->record();
        $data = (array) ($record->data ?? []);
        $data['meta']['verify_token'] = $token;
        $record->data = $data;
        $record->save();

        return $token;
    }

    /**
     * @return array<string, mixed>
     */
    private function legacy(): array
    {
        return $this->legacy ??= Setting::query()
            ->whereIn('key', ['twilio_sid', 'twilio_auth_token', 'twilio_whatsapp_number', 'whatsapp_template_new_lead', 'whatsapp_template_status_update'])
            ->pluck('value', 'key')
            ->all();
    }

    private function record(): WhatsAppSettingRecord
    {
        return $this->record ??= WhatsAppSettingRecord::query()->firstOrNew(['id' => 1]);
    }
}
