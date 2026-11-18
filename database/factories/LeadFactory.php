<?php

namespace Database\Factories;

use App\Models\ContactSource;
use App\Models\Employee;
use App\Models\Lead;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Lead>
 */
class LeadFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'client_name' => fake()->name(),
            'client_phone' => fake()->numerify('05########'),
            'client_email' => fake()->safeEmail(),
            'contact_source_id' => ContactSource::factory(),
            'status' => 'new',
            'started_at' => now()->toDateString(),
            'status_details' => null,
            'assigned_to' => null,
        ];
    }

    /**
     * Assign the lead to the given employee.
     */
    public function assignedTo(Employee $employee): static
    {
        return $this->state(fn (array $attributes) => [
            'assigned_to' => $employee->id,
        ]);
    }
}
