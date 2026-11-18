<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Bookings;

use App\Http\Requests\Api\ApiBaseRequest;
use App\Models\Booking;
use Illuminate\Validation\Rule;

/**
 * Manual booking entry from the CRM (same rules as the CRM form).
 */
final class StoreBookingRequest extends ApiBaseRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'client_name' => ['required', 'string', 'max:191'],
            'client_phone' => ['required', 'string', 'max:191'],
            'client_email' => ['nullable', 'email', 'max:191'],
            'car_id' => ['required', 'exists:cars,id'],
            'total_price' => ['nullable', 'numeric'],
            'down_payment' => ['nullable', 'numeric'],
            'duration_years' => ['nullable', 'integer'],
            'monthly_installment' => ['nullable', 'numeric'],
            'notes' => ['nullable', 'string'],
            'booking_type' => ['nullable', 'string', Rule::in(Booking::BOOKING_TYPES)],
            'location' => ['nullable', 'string', 'max:500'],
        ];
    }
}
