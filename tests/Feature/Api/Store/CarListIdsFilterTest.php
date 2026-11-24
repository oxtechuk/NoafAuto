<?php

declare(strict_types=1);

namespace Tests\Feature\Api\Store;

use App\Models\Car;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CarListIdsFilterTest extends TestCase
{
    use RefreshDatabase;

    public function test_store_cars_can_be_fetched_by_ids(): void
    {
        $wanted = Car::factory()->create();
        $other = Car::factory()->create();
        $secondWanted = Car::factory()->create();

        $ids = collect($this->getJson(route('store.api.cars.index', ['ids' => [$wanted->id, $secondWanted->id]]))
            ->assertOk()
            ->json('data'))
            ->pluck('id');

        $this->assertEqualsCanonicalizing([$wanted->id, $secondWanted->id], $ids->all());
        $this->assertNotContains($other->id, $ids);
    }

    public function test_ids_filter_finds_a_car_beyond_the_first_page(): void
    {
        $cars = Car::factory()->count(15)->create();
        $target = $cars->first();

        $this->getJson(route('v1.store.api.cars.index', ['ids' => [$target->id], 'per_page' => 1]))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $target->id);
    }

    public function test_ids_filter_never_returns_inactive_cars(): void
    {
        $inactive = Car::factory()->create(['is_active' => false]);

        $this->getJson(route('store.api.cars.index', ['ids' => [$inactive->id]]))
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_non_numeric_ids_are_ignored(): void
    {
        Car::factory()->count(2)->create();

        $this->getJson(route('store.api.cars.index', ['ids' => ['abc']]))
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_per_page_is_capped(): void
    {
        $this->getJson(route('store.api.cars.index', ['per_page' => 100000]))
            ->assertOk()
            ->assertJsonPath('meta.per_page', 100);
    }

    public function test_per_page_below_one_falls_back_to_one(): void
    {
        Car::factory()->count(2)->create();

        $this->getJson(route('store.api.cars.index', ['per_page' => 0]))
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }
}
