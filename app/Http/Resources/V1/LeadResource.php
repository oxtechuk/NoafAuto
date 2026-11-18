<?php

namespace App\Http\Resources\V1;

use App\Models\Lead;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Lead
 */
class LeadResource extends JsonResource
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
            'subject' => $this->subject,
            'country' => $this->country,
            'status' => $this->status,
            'status_label' => $this->status_label,
            'status_details' => $this->status_details,
            'started_at' => $this->started_at?->toDateString(),
            'marketing_channel' => $this->marketing_channel,
            'contact_source' => $this->whenLoaded('contactSource', fn () => $this->contactSource ? [
                'id' => $this->contactSource->id,
                'name' => $this->contactSource->name,
            ] : null),
            'car' => $this->whenLoaded('car', fn () => $this->car ? [
                'id' => $this->car->id,
                'name' => $this->car->name,
                'brand' => $this->car->relationLoaded('brand') ? $this->car->brand?->name : null,
            ] : null),
            'assigned_to' => $this->whenLoaded('employee', fn () => $this->employee ? [
                'id' => $this->employee->id,
                'name' => $this->employee->name,
            ] : null),
            'orders_count' => $this->whenCounted('orders'),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
