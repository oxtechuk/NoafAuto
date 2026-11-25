<?php

declare(strict_types=1);

namespace App\Modules\WhatsApp\Services;

use App\Models\ContactSource;
use App\Models\Lead;
use App\Modules\WhatsApp\Models\WhatsAppConversation;
use App\Modules\WhatsApp\Support\PhoneNumber;
use App\Services\BookingAssignmentService;
use Throwable;

/**
 * Finds the CRM lead behind a WhatsApp number, creating it (source "واتساب") when needed.
 */
class LeadLinker
{
    public const LEAD_SOURCE = 'واتساب';

    public function find(string $phone): ?Lead
    {
        return Lead::query()->whereIn('client_phone', PhoneNumber::variants($phone))->latest('id')->first();
    }

    /**
     * @param  int|null  $assignTo  employee to own a newly created lead; null = the CRM's round-robin
     */
    public function findOrCreate(string $phone, ?string $name = null, string $details = '', ?int $assignTo = null): Lead
    {
        $lead = $this->find($phone);
        if ($lead) {
            return $lead;
        }

        $source = ContactSource::firstOrCreate(['name' => self::LEAD_SOURCE], ['is_active' => true]);
        $lead = Lead::create([
            'client_name' => $name ?: 'عميل واتساب',
            'client_phone' => $phone,
            'subject' => 'general_inquiry',
            'status_details' => mb_substr($details, 0, 500),
            'contact_source_id' => $source->id,
            'status' => 'new',
            'started_at' => now(),
            'marketing_channel' => self::LEAD_SOURCE,
            'assigned_to' => $assignTo,
        ]);

        if ($assignTo === null) {
            try {
                app(BookingAssignmentService::class)->autoAssignLead($lead);
            } catch (Throwable) {
                // best effort
            }
        }

        return $lead;
    }

    /**
     * Link the conversation to its lead. Without $create only an existing lead is linked.
     */
    public function linkConversation(WhatsAppConversation $conversation, bool $create, string $details = ''): ?Lead
    {
        if ($conversation->lead_id && $conversation->lead) {
            return $conversation->lead;
        }

        $lead = $create
            ? $this->findOrCreate($conversation->phone, $conversation->name, $details, $conversation->assigned_to ? (int) $conversation->assigned_to : null)
            : $this->find($conversation->phone);

        if ($lead) {
            $conversation->forceFill(['lead_id' => $lead->id])->save();
            $conversation->setRelation('lead', $lead);
        }

        return $lead;
    }
}
