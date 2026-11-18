<?php

namespace Database\Factories;

use App\Models\Booking;
use App\Models\Car;
use App\Models\Employee;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Booking>
 */
class BookingFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'car_id' => Car::factory(),
            'client_name' => fake()->name(),
            'client_phone' => fake()->unique()->numerify('05########'),
            'client_email' => fake()->safeEmail(),
            'down_payment' => 25000,
            'duration_years' => 5,
            'monthly_installment' => 3500,
            'total_price' => 125000,
            'status' => 'new',
            'source' => 'website',
            'booking_type' => 'purchase',
            'assigned_to' => null,
        ];
    }

    public function assignedTo(Employee $employee): static
    {
        return $this->state(fn (array $attributes) => [
            'assigned_to' => $employee->id,
        ]);
    }

    public function status(string $status): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => $status,
        ]);
    }

    /**
     * A close request filed by a non-supervisor, awaiting approval.
     */
    public function awaitingApproval(string $proposedStatus = 'lost_no_answer'): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'waiting_supervisor_approval',
            'proposed_status' => $proposedStatus,
        ]);
    }
}
