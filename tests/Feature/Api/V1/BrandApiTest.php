<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Models\Brand;
use App\Models\Employee;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class BrandApiTest extends TestCase
{
    use RefreshDatabase;

    private Employee $admin;

    private Employee $sales;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::findOrCreate('manage-brands', 'employee');

        $this->admin = Employee::factory()->admin()->create();

        $this->sales = Employee::factory()->create();
        $this->sales->givePermissionTo('manage-brands');
    }

    public function test_guest_cannot_access_brands(): void
    {
        $this->getJson(route('api.v1.brands.index'))->assertUnauthorized();
    }

    public function test_employee_without_permission_cannot_access_brands(): void
    {
        $unauthorizedEmployee = Employee::factory()->create();

        $this->actingAs($unauthorizedEmployee, 'employee')
            ->getJson(route('api.v1.brands.index'))
            ->assertForbidden();
    }

    public function test_admin_lists_brands_paginated_and_filters(): void
    {
        Brand::factory()->create(['name' => ['ar' => 'تويوتا', 'en' => 'Toyota'], 'is_active' => true]);
        Brand::factory()->create(['name' => ['ar' => 'هيونداي', 'en' => 'Hyundai'], 'is_active' => false]);

        $this->actingAs($this->admin, 'employee')
            ->getJson(route('api.v1.brands.index', ['is_active' => 1]))
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('meta.total', 1);
    }

    public function test_admin_can_retrieve_all_brands_unpaginated_for_select(): void
    {
        $initialCount = Brand::count();
        Brand::factory()->count(3)->create();

        $this->actingAs($this->admin, 'employee')
            ->getJson(route('api.v1.brands.index', ['all' => 1]))
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount($initialCount + 3, 'data');
    }

    public function test_create_brand(): void
    {
        $payload = [
            'name' => [
                'ar' => 'مرسيدس بنز',
                'en' => 'Mercedes-Benz',
            ],
            'is_active' => true,
        ];

        $response = $this->actingAs($this->admin, 'employee')
            ->postJson(route('api.v1.brands.store'), $payload)
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.slug', 'mercedes-benz');

        $this->assertDatabaseHas('brands', [
            'id' => $response->json('data.id'),
            'slug' => 'mercedes-benz',
        ]);
    }

    public function test_show_brand(): void
    {
        $brand = Brand::factory()->create([
            'name' => ['ar' => 'بي إم دبليو', 'en' => 'BMW'],
        ]);

        $this->actingAs($this->admin, 'employee')
            ->getJson(route('api.v1.brands.show', $brand))
            ->assertOk()
            ->assertJsonPath('data.id', $brand->id);
    }

    public function test_update_brand(): void
    {
        $brand = Brand::factory()->create();

        $this->actingAs($this->admin, 'employee')
            ->putJson(route('api.v1.brands.update', $brand), [
                'name' => ['ar' => 'أودي المحدثة', 'en' => 'Audi Updated'],
                'is_active' => false,
            ])
            ->assertOk()
            ->assertJsonPath('data.slug', 'audi-updated')
            ->assertJsonPath('data.is_active', false);
    }

    public function test_delete_brand(): void
    {
        $brand = Brand::factory()->create();

        $this->actingAs($this->admin, 'employee')
            ->deleteJson(route('api.v1.brands.destroy', $brand))
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('brands', ['id' => $brand->id]);
    }
}
