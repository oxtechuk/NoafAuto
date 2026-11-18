<?php

namespace Database\Factories;

use App\Models\Brand;
use App\Models\Car;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Car>
 */
class CarFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $model = fake()->unique()->bothify('Model-??##');
        $slug = Str::slug($model);

        return [
            'brand_id' => Brand::factory(),
            'name' => ['en' => $model, 'ar' => $model],
            'slug' => ['en' => $slug, 'ar' => $slug],
            'model' => $model,
            'year' => 2025,
            'type' => 'sedan',
            'cash_price' => 125000,
            'min_down_payment' => 25000,
            'min_installment' => 3500,
            'is_active' => true,
        ];
    }
}
