<?php

namespace Database\Factories;

use App\Models\Employee;
use App\Models\Lead;
use App\Models\LeadNote;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LeadNote>
 */
class LeadNoteFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'lead_id' => Lead::factory(),
            'employee_id' => Employee::factory(),
            'body' => fake()->sentence(),
            'source' => 'manual',
        ];
    }
}
