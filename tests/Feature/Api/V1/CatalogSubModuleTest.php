<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Models\Brand;
use App\Models\Employee;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class CatalogSubModuleTest extends TestCase
{
    use RefreshDatabase;

    private Employee $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = Employee::factory()->admin()->create();
    }

    public function test_can_create_car_category(): void
    {
        $response = $this->actingAs($this->admin, 'employee')
            ->postJson('/api/v1/catalog/categories', [
                'name' => ['ar' => 'سيدان', 'en' => 'Sedan'],
                'sort_order' => 1,
                'is_active' => true,
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('car_categories', [
            'is_active' => true,
        ]);
    }

    public function test_can_create_car_model(): void
    {
        $brand = Brand::factory()->create();

        $response = $this->actingAs($this->admin, 'employee')
            ->postJson('/api/v1/catalog/models', [
                'brand_id' => $brand->id,
                'name' => ['ar' => 'كامري', 'en' => 'Camry'],
                'sort_order' => 1,
            ]);

        $response->assertStatus(201);
    }

    public function test_can_create_blog_category(): void
    {
        $response = $this->actingAs($this->admin, 'employee')
            ->postJson('/api/v1/content/blog-categories', [
                'name' => ['ar' => 'أخبار السيارات', 'en' => 'Car News'],
            ]);

        $response->assertStatus(201);
    }

    public function test_can_create_faq(): void
    {
        $response = $this->actingAs($this->admin, 'employee')
            ->postJson('/api/v1/content/faqs', [
                'question' => ['ar' => 'كيف أطلب تمويل؟', 'en' => 'How to apply?'],
                'answer' => ['ar' => 'عبر حاسبة التمويل', 'en' => 'Via calculator'],
                'is_active' => true,
            ]);

        $response->assertStatus(201);
    }
}
