<?php

declare(strict_types=1);

namespace App\Modules\AiAssistant\Tools;

use App\Models\Faq;
use App\Services\Api\Store\SettingApiService;
use Throwable;

class ShowroomInfoTool implements AssistantTool
{
    private const TOPICS = ['hours', 'branches', 'contact', 'documents', 'financing_terms', 'warranty', 'faq', 'other'];

    public function __construct(private readonly SettingApiService $settingApi) {}

    public function name(): string
    {
        return 'get_showroom_info';
    }

    public function declaration(): array
    {
        return [
            'name' => $this->name(),
            'description' => 'معلومات المعرض الرسمية: مواعيد العمل، الفروع، التواصل والواتساب، المستندات المطلوبة، شروط التمويل، الضمان، الأسئلة الشائعة.',
            'parameters' => [
                'type' => 'OBJECT',
                'properties' => [
                    'topic' => ['type' => 'STRING', 'enum' => self::TOPICS],
                ],
                'required' => ['topic'],
            ],
        ];
    }

    public function handle(array $args, ToolContext $context): ToolResult
    {
        $topic = in_array($args['topic'] ?? null, self::TOPICS, true) ? $args['topic'] : 'other';
        $showroom = (array) $context->settings->get('showroom', []);
        $footer = $this->footer();
        $contact = (array) ($footer['contact'] ?? []);
        $whatsapp = $showroom['whatsapp'] ?: ($contact['whatsapp'] ?? '');

        $data = match ($topic) {
            'hours' => ['working_hours' => $showroom['working_hours'] ?: null],
            'branches' => [
                'branches' => $showroom['branches'] ?: null,
                'address' => $contact['address'] ?? null,
                'listed_branches' => $footer['about_branches'] ?? null,
            ],
            'contact' => ['phone' => $contact['phone'] ?? null, 'whatsapp' => $whatsapp ?: null, 'email' => $contact['email'] ?? null],
            'documents' => ['documents' => $showroom['documents'] ?: null],
            'financing_terms' => ['financing_terms' => $showroom['financing_terms'] ?: null, 'disclaimer' => $context->settings->get('finance_disclaimer')],
            'warranty' => ['warranty' => $showroom['warranty'] ?: null],
            'faq' => ['faqs' => Faq::query()->limit(20)->get()->map(fn (Faq $faq) => ['q' => $faq->question, 'a' => $faq->answer])->all()],
            default => ['extra_info' => $showroom['extra_info'] ?: null],
        };

        $data = array_filter($data, fn ($value) => $value !== null && $value !== [] && $value !== '');
        if ($data === []) {
            $data = ['note' => 'هذه المعلومة غير مضافة في إعدادات المعرض. لا تخمّن، واعرض على العميل التواصل مع المعرض مباشرة.'];
        }

        $card = $topic === 'hours' || $topic === 'branches' || $topic === 'contact'
            ? ['type' => 'showroom_info', 'topic' => $topic, 'phone' => $contact['phone'] ?? null, 'whatsapp' => $whatsapp ?: null] + $data
            : null;

        return new ToolResult($data, $card);
    }

    /**
     * @return array<string, mixed>
     */
    private function footer(): array
    {
        try {
            return $this->settingApi->footer();
        } catch (Throwable) {
            return [];
        }
    }
}
