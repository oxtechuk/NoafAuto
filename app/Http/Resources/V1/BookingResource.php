<?php

namespace App\Http\Resources\V1;

use App\Models\Booking;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Booking
 */
class BookingResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'client_name' => $this->client_name,
            'client_phone' => $this->client_phone,
            'client_email' => $this->client_email,
            'status' => $this->status,
            'status_label' => $this->status_label,
            'proposed_status' => $this->proposed_status,
            'proposed_status_label' => $this->proposed_status_label,
            'booking_type' => $this->booking_type,
            'source' => $this->source,
            'location' => $this->location,
            'notes' => $this->notes,
            'pending_reason' => $this->pending_reason,
            'follow_up_at' => $this->follow_up_at?->toIso8601String(),
            'financials' => [
                'total_price' => $this->total_price,
                'down_payment' => $this->down_payment,
                'duration_years' => $this->duration_years,
                'monthly_installment' => $this->monthly_installment,
                'balloon_payment' => $this->balloon_payment,
                'purchase_price' => $this->purchase_price,
                'authorization_price' => $this->authorization_price,
                'expenses' => $this->expenses,
                'net_commission' => $this->net_commission,
                'calculator_bank_id' => $this->calculator_bank_id,
            ],
            'offer_notes' => $this->offer_notes,
            'delivery_note' => $this->delivery_note,
            'car' => $this->whenLoaded('car', fn () => $this->car ? [
                'id' => $this->car->id,
                'name' => $this->car->name,
                'brand' => $this->car->relationLoaded('brand') ? $this->car->brand?->name : null,
                'model' => $this->car->model ?: ($this->car->relationLoaded('carModel') ? $this->car->carModel?->name : null),
                'year' => $this->car->year,
                'type' => $this->car->type ?: ($this->car->relationLoaded('category') ? $this->car->category?->name : null),
                'cash_price' => $this->car->cash_price ?: ($this->car->current_price ?: $this->total_price),
            ] : null),
            'bank_name' => $this->whenLoaded('financingBank', fn () => $this->financingBank?->name)
                ?? ($this->whenLoaded('calculatorBank', fn () => $this->calculatorBank?->name)),
            'calculator_details' => $this->whenLoaded('calculatorLead', fn () => $this->calculatorLead?->details),
            'marketing_channel' => $this->marketing_channel,
            'utm_source' => $this->utm_source,
            'assigned_to' => $this->whenLoaded('employee', fn () => $this->employee ? [
                'id' => $this->employee->id,
                'name' => $this->employee->name,
            ] : null),
            'history' => $this->whenLoaded('notes_list', fn () => $this->notes_list->map(fn ($note) => [
                'id' => $note->id,
                'type' => $note->type,
                'note' => $note->note,
                'old_status' => $note->old_status,
                'new_status' => $note->new_status,
                'employee' => $note->relationLoaded('employee') ? $note->employee?->name : null,
                'created_at' => $note->created_at?->toIso8601String(),
            ])->values()),
            'documents' => $this->whenLoaded('documents', fn () => $this->documents->map(fn ($document) => [
                'id' => $document->id,
                'title' => $document->title,
                'file_type' => $document->file_type,
                'created_at' => $document->created_at?->toIso8601String(),
            ])->values()),
            'last_contacted_at' => $this->last_contacted_at?->toIso8601String(),
            'delivered_at' => $this->delivered_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
