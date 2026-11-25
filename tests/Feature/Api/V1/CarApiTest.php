<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Models\Brand;
use App\Models\Car;
use App\Models\Employee;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class CarApiTest extends TestCase
{
    use RefreshDatabase;

    private Employee $admin;

    private Employee $sales;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::findOrCreate('manage-cars', 'employee');

        $this->admin = Employee::factory()->admin()->create();

        $this->sales = Employee::factory()->create();
        $this->sales->givePermissionTo('manage-cars');
    }

    public function test_guest_cannot_access_cars(): void
    {
        $this->getJson(route('api.v1.cars.index'))->assertUnauthorized();
    }

    public function test_employee_without_permission_cannot_access_cars(): void
    {
        $unauthorizedEmployee = Employee::factory()->create();

        $this->actingAs($unauthorizedEmployee, 'employee')
            ->getJson(route('api.v1.cars.index'))
            ->assertForbidden();
    }

    public function test_admin_lists_cars_paginated_and_filters(): void
    {
        $brandToyota = Brand::factory()->create(['name' => ['ar' => 'تويوتا', 'en' => 'Toyota']]);
        $brandNissan = Brand::factory()->create(['name' => ['ar' => 'نيسان', 'en' => 'Nissan']]);

        Car::factory()->create(['brand_id' => $brandToyota->id, 'is_active' => true]);
        Car::factory()->create(['brand_id' => $brandNissan->id, 'is_active' => true]);

        $this->actingAs($this->admin, 'employee')
            ->getJson(route('api.v1.cars.index', ['brand_id' => $brandToyota->id]))
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('meta.total', 1);
    }

    public function test_create_car(): void
    {
        $brand = Brand::factory()->create();

        $payload = [
            'name' => [
                'ar' => 'كامري جي ال اكس',
                'en' => 'Camry GLX',
            ],
            'brand_id' => $brand->id,
            'year' => 2025,
            'type' => 'sedan',
            'cash_price' => 115000,
            'min_down_payment' => 15000,
            'min_installment' => 2200,
            'is_active' => true,
        ];

        $response = $this->actingAs($this->admin, 'employee')
            ->postJson(route('api.v1.cars.store'), $payload)
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.cash_price', 115000)
            ->assertJsonPath('data.brand.id', $brand->id);

        $this->assertDatabaseHas('cars', [
            'id' => $response->json('data.id'),
            'brand_id' => $brand->id,
            'year' => 2025,
        ]);
    }

    public function test_show_car(): void
    {
        $car = Car::factory()->create();

        $this->actingAs($this->admin, 'employee')
            ->getJson(route('api.v1.cars.show', $car))
            ->assertOk()
            ->assertJsonPath('data.id', $car->id);
    }

    public function test_update_car(): void
    {
        $car = Car::factory()->create(['cash_price' => 100000]);

        $this->actingAs($this->admin, 'employee')
            ->putJson(route('api.v1.cars.update', $car), [
                'name' => [
                    'ar' => 'كامري معدلة',
                    'en' => 'Camry Updated',
                ],
                'brand_id' => $car->brand_id,
                'cash_price' => 120000,
            ])
            ->assertOk()
            ->assertJsonPath('data.cash_price', 120000);

        $this->assertDatabaseHas('cars', [
            'id' => $car->id,
            'cash_price' => 120000,
        ]);
    }

    public function test_delete_car(): void
    {
        $car = Car::factory()->create();

        $this->actingAs($this->admin, 'employee')
            ->deleteJson(route('api.v1.cars.destroy', $car))
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('cars', ['id' => $car->id]);
    }

    public function test_car_without_thumbnail_returns_default_car_image(): void
    {
        $car = Car::factory()->create(['thumbnail' => null]);

        $res = $this->actingAs($this->admin, 'employee')
            ->getJson(route('api.v1.cars.show', $car))
            ->assertOk();

        $defaultImage = Car::getDefaultCarImage();
        $this->assertSame($defaultImage, $res->json('data.main_image'));
        $this->assertSame($defaultImage, $res->json('data.thumbnail'));
    }
}
