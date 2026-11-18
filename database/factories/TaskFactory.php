<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Employee;
use App\Models\Task;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Task>
 */
class TaskFactory extends Factory
{
    protected $model = Task::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title' => fake()->sentence(4),
            'description' => fake()->paragraph(),
            'status' => 'new',
            'priority' => 'medium',
            'assigned_to' => Employee::factory(),
            'due_date' => now()->addDays(2)->toDateString(),
            'created_by' => Employee::factory(),
            'booking_id' => null,
        ];
    }

    public function inProgress(): static
    {
        return $this->state(fn () => ['status' => 'in_progress']);
    }

    public function done(): static
    {
        return $this->state(fn () => ['status' => 'done']);
    }

    public function highPriority(): static
    {
        return $this->state(fn () => ['priority' => 'high']);
    }

    public function overdue(): static
    {
        return $this->state(fn () => [
            'status' => 'new',
            'due_date' => now()->subDays(2)->toDateString(),
        ]);
    }
}
