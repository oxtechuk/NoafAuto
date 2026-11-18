<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Leads;

use App\Http\Requests\Api\ApiBaseRequest;
use App\Models\Lead;
use Illuminate\Validation\Rule;

final class LeadRequest extends ApiBaseRequest
{
    /**
     * Same rules as the CRM lead form.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'client_name' => ['required', 'string', 'max:200'],
            'client_phone' => ['nullable', 'string', 'max:40'],
            'client_email' => ['nullable', 'email', 'max:200'],
            'contact_source_id' => ['required', 'exists:contact_sources,id'],
            'status' => ['required', Rule::in(array_keys(Lead::STATUSES))],
            'started_at' => ['required', 'date'],
            'status_details' => ['nullable', 'string', 'max:5000'],
            'car_id' => ['nullable', 'exists:cars,id'],
            'assigned_to' => ['nullable', 'exists:employees,id'],
        ];
    }
}
