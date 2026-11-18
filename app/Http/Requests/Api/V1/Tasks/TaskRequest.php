<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Tasks;

use App\Http\Requests\Api\ApiBaseRequest;
use Illuminate\Validation\Rule;

final class TaskRequest extends ApiBaseRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'status' => ['required', Rule::in(['new', 'in_progress', 'done'])],
            'priority' => ['required', Rule::in(['low', 'medium', 'high'])],
            'assigned_to' => ['nullable', 'exists:employees,id'],
            'due_date' => ['nullable', 'date'],
            'booking_id' => ['nullable', 'exists:bookings,id'],
        ];
    }
}
