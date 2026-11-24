<?php

declare(strict_types=1);

namespace Tests\Feature\Api\Store;

use App\Models\Car;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CarHorsepowerFilterTest extends TestCase
{
    use RefreshDatabase;

    public function test_horsepower_column_is_synced_from_specs_on_save(): void
    {
        $car = Car::factory()->create(['specs' => ['hp' => '250 HP @ 6000 rpm']]);

        $this->assertDatabaseHas('cars', ['id' => $car->id, 'horsepower' => 250]);

        $car->update(['specs' => ['fuel' => 'petrol']]);

        $this->assertDatabaseHas('cars', ['id' => $car->id, 'horsepower' => null]);
    }

    public function test_parse_horsepower_handles_free_form_values(): void
    {
        $this->assertSame(180, Car::parseHorsepower('180'));
        $this->assertSame(1200, Car::parseHorsepower('1,200 hp'));
        $this->assertSame(300, Car::parseHorsepower('300-350'));
        $this->assertNull(Car::parseHorsepower('N/A'));
        $this->assertNull(Car::parseHorsepower(''));
        $this->assertNull(Car::parseHorsepower(null));
    }

    public function test_store_cars_can_be_filtered_by_horsepower_range(): void
    {
        $weak = Car::factory()->create(['specs' => ['hp' => '120']]);
        $mid = Car::factory()->create(['specs' => ['hp' => '200 hp']]);
        $strong = Car::factory()->create(['specs' => ['hp' => '400']]);
        $unknown = Car::factory()->create(['specs' => null]);
        $inactive = Car::factory()->create(['specs' => ['hp' => '210'], 'is_active' => false]);

        $ids = collect($this->getJson(route('store.api.cars.index', ['min_hp' => 150, 'max_hp' => 300]))
            ->assertOk()
            ->json('data'))
            ->pluck('id');

        $this->assertEqualsCanonicalizing([$mid->id], $ids->all());
        $this->assertNotContains($weak->id, $ids);
        $this->assertNotContains($strong->id, $ids);
        $this->assertNotContains($unknown->id, $ids);
        $this->assertNotContains($inactive->id, $ids);
    }

    public function test_store_cars_min_horsepower_only(): void
    {
        Car::factory()->create(['specs' => ['hp' => '120']]);
        $strong = Car::factory()->create(['specs' => ['hp' => '400']]);

        $ids = collect($this->getJson(route('store.api.cars.index', ['min_hp' => 351]))
            ->assertOk()
            ->json('data'))
            ->pluck('id')
            ->all();

        $this->assertSame([$strong->id], $ids);
    }

    public function test_store_cars_still_expose_main_image(): void
    {
        Car::factory()->create(['thumbnail' => 'cars/example.jpg']);

        $this->getJson(route('store.api.cars.index'))
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'main_image']]]);
    }
}
