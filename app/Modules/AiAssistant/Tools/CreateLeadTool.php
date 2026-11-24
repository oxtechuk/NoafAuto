<?php

declare(strict_types=1);

namespace App\Modules\AiAssistant\Tools;

use App\Models\Car;
use App\Models\ContactSource;
use App\Models\Lead;
use App\Services\Api\Store\Helpers\SlugResolver;
use App\Services\BookingAssignmentService;
use Throwable;

/**
 * The only write tool: registers the customer as a lead in the CRM after explicit consent.
 */
class CreateLeadTool implements AssistantTool
{
    public const SOURCE_NAME = 'المساعد الذكي';

    public function name(): string
    {
        return 'create_lead';
    }

    public function declaration(): array
    {
        return [
            'name' => $this->name(),
            'description' => 'سجّل طلب العميل عند المعرض ليتواصل معه موظف. لا تستخدمها إلا بعد أن يعطي العميل اسمه ورقم جواله ويوافق صراحة على التواصل.',
            'parameters' => [
                'type' => 'OBJECT',
                'properties' => [
                    'name' => ['type' => 'STRING'],
                    'phone' => ['type' => 'STRING', 'description' => 'جوال سعودي 05xxxxxxxx'],
                    'car_slug' => ['type' => 'STRING', 'description' => 'السيارة المهتم بها (اختياري)'],
                    'summary' => ['type' => 'STRING', 'description' => 'ملخص قصير لاحتياج العميل (الميزانية، النوع، كاش/قسط...)'],
                    'preferred_contact_time' => ['type' => 'STRING'],
                    'consent' => ['type' => 'BOOLEAN', 'description' => 'true فقط إذا وافق العميل صراحة على التواصل'],
                ],
                'required' => ['name', 'phone', 'consent'],
            ],
        ];
    }

    public function handle(array $args, ToolContext $context): ToolResult
    {
        $conversation = $context->conversation;
        if ($conversation->lead_id) {
            return new ToolResult(['status' => 'already_registered', 'lead_id' => $conversation->lead_id]);
        }

        if (($args['consent'] ?? false) !== true) {
            return ToolResult::error('لم يوافق العميل صراحة على التواصل. اسأله أولاً.');
        }

        $name = trim((string) ($args['name'] ?? ''));
        $phone = preg_replace('/\D+/', '', (string) ($args['phone'] ?? ''));
        if (str_starts_with($phone, '9665')) {
            $phone = '0'.substr($phone, 3);
        }
        if ($name === '' || ! preg_match('/^05\d{8}$/', $phone)) {
            return ToolResult::error('الاسم أو رقم الجوال غير صحيح. الجوال لازم يكون بصيغة 05xxxxxxxx.');
        }

        $carId = null;
        if (! empty($args['car_slug'])) {
            $query = Car::query()->where('is_active', true);
            SlugResolver::applyCarSlug($query, (string) $args['car_slug']);
            $carId = $query->value('id');
        }

        $details = trim(implode("\n", array_filter([
            'طلب من المساعد الذكي (محادثة #'.$conversation->id.')',
            ! empty($args['summary']) ? 'الاحتياج: '.$args['summary'] : null,
            ! empty($args['preferred_contact_time']) ? 'وقت التواصل المفضل: '.$args['preferred_contact_time'] : null,
        ])));

        $source = ContactSource::firstOrCreate(['name' => self::SOURCE_NAME], ['is_active' => true]);

        $lead = Lead::create([
            'client_name' => mb_substr($name, 0, 255),
            'client_phone' => $phone,
            'car_id' => $carId,
            'subject' => 'general_inquiry',
            'status_details' => $details,
            'contact_source_id' => $source->id,
            'status' => 'new',
            'started_at' => now(),
            'marketing_channel' => self::SOURCE_NAME,
        ]);

        try {
            app(BookingAssignmentService::class)->autoAssignLead($lead);
        } catch (Throwable) {
            // Assignment is best-effort; the lead is already saved.
        }

        $conversation->forceFill(['lead_id' => $lead->id])->save();

        return new ToolResult(
            ['status' => 'registered', 'lead_id' => $lead->id],
            ['type' => 'lead_created', 'lead_id' => $lead->id],
        );
    }
}
