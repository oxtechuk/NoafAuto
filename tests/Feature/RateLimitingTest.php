<?php

namespace Tests\Feature;

use App\Services\TwilioOtpService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery\MockInterface;
use Tests\TestCase;

class RateLimitingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->mock(TwilioOtpService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('sendOtp')->andReturn(['success' => true, 'message' => 'sent']);
        });
    }

    public function test_otp_send_is_limited_per_ip(): void
    {
        foreach (range(1, 3) as $attempt) {
            $this->postJson(route('store.api.calculator.otp.send'), ['name' => 'Test', 'phone' => "05000000{$attempt}"])
                ->assertOk();
        }

        $this->postJson(route('store.api.calculator.otp.send'), ['name' => 'Test', 'phone' => '0500000009'])
            ->assertTooManyRequests();
    }

    public function test_otp_send_is_limited_per_phone_across_ips(): void
    {
        foreach (range(1, 5) as $attempt) {
            $this->withServerVariables(['REMOTE_ADDR' => "10.0.0.{$attempt}"])
                ->postJson(route('store.api.calculator.otp.send'), ['name' => 'Test', 'phone' => '+966 500 000 001'])
                ->assertOk();
        }

        $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.99'])
            ->postJson(route('store.api.calculator.otp.send'), ['name' => 'Test', 'phone' => '966500000001'])
            ->assertTooManyRequests();
    }

    public function test_crm_login_is_limited_after_five_attempts(): void
    {
        foreach (range(1, 5) as $attempt) {
            $this->post(route('crm.login.post'), ['username' => 'admin', 'password' => 'wrong'])
                ->assertRedirect();
        }

        $this->post(route('crm.login.post'), ['username' => 'admin', 'password' => 'wrong'])
            ->assertTooManyRequests();
    }

    public function test_public_forms_are_limited_per_ip(): void
    {
        foreach (range(1, 10) as $attempt) {
            $this->postJson(route('store.api.contact.store'), [])->assertUnprocessable();
        }

        $this->postJson(route('store.api.contact.store'), [])->assertTooManyRequests();
    }
}
