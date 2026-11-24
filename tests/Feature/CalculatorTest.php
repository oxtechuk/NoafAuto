<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\CalculatorBank;
use App\Models\Car;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class CalculatorTest extends TestCase
{
    use RefreshDatabase;

    private Car $car;

    private CalculatorBank $bank;

    protected function setUp(): void
    {
        parent::setUp();

        $brand = Brand::create([
            'name' => ['ar' => 'تويوتا', 'en' => 'Toyota'],
            'slug' => 'toyota',
            'is_active' => true,
        ]);

        $this->car = Car::create([
            'brand_id' => $brand->id,
            'name' => ['ar' => 'كامري', 'en' => 'Camry'],
            'model' => 'LE',
            'type' => 'sedan',
            'slug' => 'camry-2025',
            'year' => 2025,
            'cash_price' => 100000,
            'min_down_payment' => 10000,
            'min_installment' => 1800,
            'is_active' => true,
        ]);

        $this->bank = CalculatorBank::create([
            'name' => 'مصرف الراجحي',
            'slug' => 'alrajhi',
            'annual_rate' => 3.5,
            'is_active' => true,
            'is_default' => true,
        ]);
    }

    public function test_calculator_banks_endpoint_returns_banks(): void
    {
        $response = $this->getJson('/api/store/calculator/banks');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    '*' => ['id', 'name', 'annual_rate'],
                ],
            ]);
    }

    public function test_calculate_endpoint_works_with_default_bank(): void
    {
        $response = $this->postJson('/api/store/calculator/calculate', [
            'car_id' => $this->car->id,
            'down_payment_percentage' => 10,
            'period_months' => 60,
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'car_price',
                    'down_payment_amount',
                    'down_payment_percentage',
                    'loan_amount',
                    'monthly_payment',
                    'period_months',
                    'total_payment',
                    'total_interest',
                    'annual_rate',
                    'bank' => ['id', 'name'],
                ],
            ]);

        $this->assertGreaterThan(0, $response->json('data.monthly_payment'));
    }

    public function test_calculate_endpoint_works_with_specific_bank(): void
    {
        $response = $this->postJson('/api/store/calculator/calculate', [
            'car_id' => $this->car->id,
            'down_payment_percentage' => 20,
            'period_months' => 36,
            'bank_id' => $this->bank->id,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.bank.id', $this->bank->id);

        $this->assertGreaterThan(0, $response->json('data.monthly_payment'));
    }

    public function test_save_lead_endpoint_works_with_financial_details(): void
    {
        Queue::fake();

        $response = $this->postJson('/api/store/calculator/lead', [
            'name' => 'محمد أحمد',
            'phone' => '0512345678',
            'city' => 'الرياض',
            'salary' => 12000,
            'monthly_obligations' => 1500,
            'car_ids' => [$this->car->id],
            'preferred_bank_id' => $this->bank->id,
            'monthly_installment' => 2400,
            'down_payment' => 15000,
            'period_months' => 60,
            'preferred_color' => 'أبيض',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'lead_id',
                ],
            ]);
    }

    public function test_lead_without_car_is_saved_without_creating_booking(): void
    {
        Queue::fake();

        $this->postJson('/api/v1/store/calculator/lead', [
            'name' => 'عميل بدون سيارة',
            'phone' => '0512345670',
            'city' => 'الدمام',
            'salary' => 9000,
            'monthly_obligations' => 0,
        ])->assertStatus(201);

        $this->assertDatabaseCount('calculator_leads', 1);
        $this->assertDatabaseMissing('bookings', ['client_name' => 'عميل بدون سيارة']);
    }

    public function test_submitted_lead_from_external_storefront_creates_purchase_booking(): void
    {
        Queue::fake();

        $this->postJson('/api/v1/store/calculator/lead', [
            'car_ids' => [$this->car->id],
            'name' => 'عميل واجهة مستقلة',
            'phone' => '0512345679',
            'city' => 'جدة',
            'salary' => 15000,
            'monthly_obligations' => 2000,
            'down_payment' => 20000,
            'period_months' => 60,
            'preferred_color' => 'black',
            'is_submitted' => true,
        ])->assertStatus(201);

        $this->assertDatabaseHas('calculator_leads', ['car_id' => $this->car->id]);
        $this->assertDatabaseHas('bookings', [
            'client_name' => 'عميل واجهة مستقلة',
            'car_id' => $this->car->id,
            'source' => 'cars',
            'booking_type' => 'purchase',
        ]);
    }
}
