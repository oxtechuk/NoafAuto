<?php

declare(strict_types=1);

namespace App\Modules\AiAssistant\Services;

use App\Modules\AiAssistant\Models\AssistantSettingRecord;

/**
 * Assistant configuration owned by the showroom (admin → المساعد الذكي).
 *
 * Every value has a default, so the assistant works as soon as the owner
 * adds their own Gemini API key; everything else is optional tuning.
 */
class AssistantSettings
{
    /** Topics the owner can allow (shown as checkboxes in the admin). */
    public const TOPICS = [
        'cars' => 'السيارات المتوفرة ومواصفاتها',
        'comparison' => 'المقارنة بين السيارات',
        'financing' => 'الأقساط والتمويل والبنوك',
        'offers' => 'العروض الحالية',
        'showroom' => 'مواعيد المعرض والفروع والتواصل',
        'documents' => 'المستندات المطلوبة للشراء أو التمويل',
        'booking' => 'الحجز وتجربة القيادة',
        'maintenance' => 'الصيانة والضمان',
        'import' => 'طلب سيارة غير متوفرة (استيراد/طلب مخصص)',
    ];

    /** Restrictions the owner can enable. */
    public const BLOCKED = [
        'politics_religion' => 'الحديث في السياسة أو الدين',
        'competitors' => 'ذكر معارض أو وكالات منافسة بالاسم',
        'approval_promises' => 'وعد العميل بموافقة بنكية أو نسبة تمويل نهائية',
        'legal_advice' => 'تقديم استشارات قانونية أو شرعية',
        'unlisted_prices' => 'ذكر أي سعر أو قسط غير موجود في بيانات النظام',
        'unlisted_discounts' => 'عرض خصومات غير موجودة في العروض الحالية',
        'other_customers' => 'مشاركة أي بيانات عن عملاء آخرين',
        'off_topic' => 'الرد على أي موضوع لا علاقة له بالسيارات والمعرض',
    ];

    public const TOOLS = [
        'search_cars', 'get_car', 'compare_cars', 'calculate_installment', 'list_offers', 'get_showroom_info', 'create_lead',
    ];

    private const LIST_KEYS = ['allowed_topics', 'blocked_topics', 'quick_replies', 'blocked_keywords'];

    private ?AssistantSettingRecord $record = null;

    /**
     * @return array<string, mixed>
     */
    public static function defaults(): array
    {
        return [
            'enabled' => true,
            'show_on_storefront' => true,
            'provider' => 'gemini',
            'model' => 'gemini-flash-lite-latest',
            'temperature' => 0.4,
            'max_output_tokens' => 1024,

            'assistant_name' => 'المساعد الذكي',
            'greeting' => 'هلا والله! أنا مساعدك لاختيار سيارتك. تبيها كاش ولا قسط؟ وكم ميزانيتك تقريباً؟',
            'bubble_title' => 'تبيها كاش ولا قسط؟',
            'bubble_text' => 'خلّنا نلقى سيارتك.',
            'tone' => 'ودود ومحترم، لهجة سعودية بسيطة، جمل قصيرة وواضحة',
            'quick_replies' => ['أبغى سيارة عائلية', 'ميزانيتي قسط شهري', 'قارن لي بين سيارتين', 'وش مواعيد المعرض؟'],

            'allowed_topics' => array_keys(self::TOPICS),
            'blocked_topics' => array_keys(self::BLOCKED),
            'custom_rules' => '',
            'blocked_keywords' => [],
            'off_topic_reply' => 'أقدر أساعدك في كل ما يخص سيارات المعرض والتمويل والحجز. وش نوع السيارة اللي تدوّر عليها؟',
            'finance_disclaimer' => 'الأقساط تقديرية، والقسط النهائي يحدده البنك بعد دراسة الطلب.',
            'unavailable_reply' => 'المساعد غير متاح حالياً، تقدر تتواصل معنا مباشرة وبنخدمك.',

            'showroom' => [
                'working_hours' => '',
                'branches' => '',
                'documents' => '',
                'financing_terms' => '',
                'warranty' => '',
                'extra_info' => '',
                'whatsapp' => '',
            ],

            'tools' => array_fill_keys(self::TOOLS, true),
            'show_prices' => true,
            'max_results' => 4,
            'lead_capture' => 'after_recommendation',

            'limits' => [
                'max_messages_per_session' => 40,
                'max_messages_per_hour_per_ip' => 60,
                'daily_message_limit' => 1000,
                'max_tool_rounds' => 4,
                'max_message_length' => 600,
                'history_window' => 16,
            ],
            'retention_days' => 90,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function all(): array
    {
        $stored = (array) ($this->record()->data ?? []);
        $settings = array_replace_recursive(self::defaults(), $stored);

        // Lists are replaced as a whole (a recursive merge would keep default items the owner removed).
        foreach (self::LIST_KEYS as $listKey) {
            if (array_key_exists($listKey, $stored)) {
                $settings[$listKey] = array_values((array) $stored[$listKey]);
            }
        }

        return $settings;
    }

    public function get(string $key, mixed $default = null): mixed
    {
        return data_get($this->all(), $key, $default);
    }

    public function toolEnabled(string $tool): bool
    {
        return (bool) $this->get("tools.{$tool}", false);
    }

    /**
     * @param  array<string, mixed>  $values
     */
    public function update(array $values, ?string $apiKey = null): void
    {
        $record = $this->record();
        // Lists replace (not merge) so unchecking a topic actually removes it.
        $data = array_replace_recursive((array) ($record->data ?? []), $values);
        foreach (self::LIST_KEYS as $listKey) {
            if (array_key_exists($listKey, $values)) {
                $data[$listKey] = array_values((array) $values[$listKey]);
            }
        }

        $record->data = $data;
        if ($apiKey !== null) {
            $record->api_key = $apiKey === '' ? null : $apiKey;
        }
        $record->save();
    }

    public function apiKey(): ?string
    {
        $key = $this->record()->api_key;

        return $key !== null && $key !== '' ? $key : null;
    }

    public function hasApiKey(): bool
    {
        return $this->apiKey() !== null;
    }

    public function maskedApiKey(): ?string
    {
        $key = $this->apiKey();

        return $key === null ? null : '••••'.substr($key, -4);
    }

    /** Ready to answer customers: enabled and connected with the owner's key. */
    public function isReady(): bool
    {
        return (bool) $this->get('enabled') && $this->hasApiKey();
    }

    public function fresh(): self
    {
        $this->record = null;

        return $this;
    }

    private function record(): AssistantSettingRecord
    {
        return $this->record ??= AssistantSettingRecord::query()->firstOrNew(['id' => 1]);
    }
}
