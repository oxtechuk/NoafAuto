<?php

declare(strict_types=1);

namespace Tests\Feature\Modules;

use App\Models\Employee;
use App\Modules\WhatsApp\Models\WhatsAppConversation;
use App\Modules\WhatsApp\Models\WhatsAppMessage;
use App\Modules\WhatsApp\Models\WhatsAppTemplate;
use App\Modules\WhatsApp\Services\WhatsAppSettings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class WhatsAppMetaOnboardingTest extends TestCase
{
    use RefreshDatabase;

    private const PLATFORM_SECRET = 'platform-app-secret';

    private Employee $admin;

    protected function setUp(): void
    {
        parent::setUp();
        Http::preventStrayRequests();

        config([
            'whatsapp.embedded_signup.app_id' => '111222333',
            'whatsapp.embedded_signup.app_secret' => self::PLATFORM_SECRET,
            'whatsapp.embedded_signup.config_id' => '444555666',
        ]);
        $this->admin = Employee::factory()->admin()->create();
    }

    private function settings(): WhatsAppSettings
    {
        return app(WhatsAppSettings::class)->fresh();
    }

    private function connectMeta(): void
    {
        $this->settings()->update(
            ['provider' => 'meta', 'meta' => ['phone_number_id' => '1234567890', 'business_account_id' => '9876543210']],
            ['meta' => ['access_token' => 'EAAG-token']],
        );
    }

    private function signup(array $overrides = []): TestResponse
    {
        return $this->actingAs($this->admin, 'employee')->postJson(route('api.v1.whatsapp.onboarding.embedded'), [
            'code' => 'AQ-code',
            'waba_id' => '9876543210',
            'phone_number_id' => '1234567890',
            ...$overrides,
        ]);
    }

    public function test_settings_expose_embedded_signup_config_without_the_secret(): void
    {
        $response = $this->actingAs($this->admin, 'employee')->getJson(route('api.v1.whatsapp.settings'))->assertOk()
            ->assertJsonPath('data.embedded_signup.available', true)
            ->assertJsonPath('data.embedded_signup.app_id', '111222333')
            ->assertJsonPath('data.embedded_signup.config_id', '444555666');

        $this->assertStringNotContainsString(self::PLATFORM_SECRET, $response->getContent());
    }

    public function test_embedded_signup_connects_the_number_and_points_webhooks_at_this_showroom(): void
    {
        Http::fake([
            'graph.facebook.com/*/oauth/access_token*' => Http::response(['access_token' => 'EAAB-business-token', 'token_type' => 'bearer']),
            'graph.facebook.com/*/9876543210/subscribed_apps' => Http::response(['success' => true]),
            'graph.facebook.com/*/1234567890/register' => Http::response(['success' => true]),
        ]);

        $this->signup()->assertOk()
            ->assertJsonPath('data.configured', true)
            ->assertJsonPath('data.settings.meta.connection', 'embedded')
            ->assertJsonPath('data.warnings', []);

        $settings = $this->settings();
        $this->assertSame('meta', $settings->provider());
        $this->assertSame('1234567890', $settings->get('meta.phone_number_id'));
        $this->assertSame('9876543210', $settings->get('meta.business_account_id'));
        $this->assertSame('EAAB-business-token', $settings->secret('meta', 'access_token'));
        $this->assertMatchesRegularExpression('/^\d{6}$/', (string) $settings->secret('meta', 'pin'));

        Http::assertSent(fn (HttpRequest $r) => str_contains($r->url(), '/oauth/access_token')
            && str_contains($r->url(), 'client_id=111222333') && str_contains($r->url(), 'code=AQ-code'));
        Http::assertSent(fn (HttpRequest $r) => str_ends_with($r->url(), '/9876543210/subscribed_apps')
            && $r['override_callback_uri'] === route('whatsapp.webhook.meta')
            && $r['verify_token'] === $settings->get('meta.verify_token')
            && $r->hasHeader('Authorization', 'Bearer EAAB-business-token'));
        Http::assertSent(fn (HttpRequest $r) => str_ends_with($r->url(), '/1234567890/register') && $r['messaging_product'] === 'whatsapp');
    }

    public function test_embedded_signup_keeps_the_connection_and_reports_partial_failures(): void
    {
        Http::fake([
            'graph.facebook.com/*/oauth/access_token*' => Http::response(['access_token' => 'EAAB-business-token']),
            'graph.facebook.com/*/subscribed_apps' => Http::response(['success' => true]),
            'graph.facebook.com/*/register' => Http::response(['error' => ['message' => 'Two-step verification PIN mismatch']], 400),
        ]);

        $this->signup()->assertOk()->assertJsonCount(1, 'data.warnings');
        $this->assertSame('EAAB-business-token', $this->settings()->secret('meta', 'access_token'));
    }

    public function test_rejected_code_changes_nothing(): void
    {
        Http::fake(['graph.facebook.com/*' => Http::response(['error' => ['message' => 'Invalid verification code']], 400)]);

        $this->signup()->assertUnprocessable();
        $this->assertNull($this->settings()->secret('meta', 'access_token'));
    }

    public function test_embedded_signup_needs_the_platform_app_and_an_admin(): void
    {
        $this->signup(['waba_id' => 'abc'])->assertUnprocessable()->assertJsonValidationErrors('waba_id');

        $this->actingAs(Employee::factory()->create(), 'employee')
            ->postJson(route('api.v1.whatsapp.onboarding.embedded'), ['code' => 'x', 'waba_id' => '12345', 'phone_number_id' => '12345'])
            ->assertForbidden();

        config(['whatsapp.embedded_signup.app_id' => '']);
        $this->signup()->assertUnprocessable();
    }

    public function test_health_is_read_from_meta_and_cached(): void
    {
        $this->connectMeta();
        Http::fake([
            'graph.facebook.com/*/1234567890*' => Http::response([
                'display_phone_number' => '+966 9200 12345', 'verified_name' => 'زاد كابيتال', 'name_status' => 'APPROVED',
                'quality_rating' => 'GREEN', 'messaging_limit_tier' => 'TIER_1K',
            ]),
            'graph.facebook.com/*/9876543210*' => Http::response(['name' => 'Zad', 'account_review_status' => 'APPROVED']),
        ]);

        $this->actingAs($this->admin, 'employee')->getJson(route('api.v1.whatsapp.health'))->assertOk()
            ->assertJsonPath('data.ok', true)
            ->assertJsonPath('data.phone.quality_rating', 'GREEN')
            ->assertJsonPath('data.phone.verified_name', 'زاد كابيتال')
            ->assertJsonPath('data.account.account_review_status', 'APPROVED');
        $this->actingAs($this->admin, 'employee')->getJson(route('api.v1.whatsapp.health'))->assertOk();
        Http::assertSentCount(2);

        $this->actingAs($this->admin, 'employee')->getJson(route('api.v1.whatsapp.health', ['refresh' => 1]))->assertOk();
        Http::assertSentCount(4);

        $this->actingAs(Employee::factory()->create(), 'employee')->getJson(route('api.v1.whatsapp.health'))->assertForbidden();
    }

    public function test_templates_are_synced_from_meta_and_stale_ones_removed(): void
    {
        $this->connectMeta();
        WhatsAppTemplate::create(['name' => 'deleted_in_meta', 'language' => 'ar', 'status' => 'approved']);
        Http::fake([
            'graph.facebook.com/*/9876543210/message_templates*' => Http::response(['data' => [
                ['id' => '1', 'name' => 'booking_created', 'language' => 'ar', 'status' => 'APPROVED', 'category' => 'UTILITY',
                    'components' => [['type' => 'BODY', 'text' => 'أهلاً {{1}}، استلمنا طلبك على {{2}}']]],
                ['id' => '2', 'name' => 'ramadan_offer', 'language' => 'ar', 'status' => 'REJECTED', 'category' => 'MARKETING', 'rejected_reason' => 'INVALID_FORMAT', 'components' => []],
            ], 'paging' => ['cursors' => ['after' => 'X']]]),
        ]);

        $this->actingAs($this->admin, 'employee')->postJson(route('api.v1.whatsapp.templates.sync'))->assertOk()->assertJsonPath('data.count', 2);

        $this->assertDatabaseMissing('wa_templates', ['name' => 'deleted_in_meta']);
        $templates = collect($this->actingAs($this->admin, 'employee')->getJson(route('api.v1.whatsapp.templates'))->assertOk()->json('data'))->keyBy('name');
        $this->assertSame(['utility', 'approved', 2], [$templates['booking_created']['category'], $templates['booking_created']['status'], $templates['booking_created']['parameters']]);
        $this->assertSame('INVALID_FORMAT', $templates['ramadan_offer']['rejected_reason']);
    }

    public function test_template_sync_requires_the_business_account(): void
    {
        $this->settings()->update(['provider' => 'meta', 'meta' => ['phone_number_id' => '1234567890']], ['meta' => ['access_token' => 'EAAG-token']]);

        $this->actingAs($this->admin, 'employee')->postJson(route('api.v1.whatsapp.templates.sync'))->assertUnprocessable();
    }

    public function test_webhooks_signed_by_the_platform_app_record_meta_pricing(): void
    {
        $this->connectMeta();
        $conversation = WhatsAppConversation::create(['phone' => '966551234567']);
        $message = $conversation->messages()->create(['direction' => 'out', 'provider' => 'meta', 'type' => 'template', 'event' => 'campaign', 'provider_message_id' => 'wamid.T1', 'status' => 'sent']);

        $body = json_encode(['object' => 'whatsapp_business_account', 'entry' => [['changes' => [['field' => 'messages', 'value' => [
            'statuses' => [['id' => 'wamid.T1', 'status' => 'delivered', 'pricing' => ['billable' => true, 'pricing_model' => 'PMP', 'category' => 'marketing']]],
        ]]]]]]);

        $this->call('POST', route('whatsapp.webhook.meta'), [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_HUB_SIGNATURE_256' => 'sha256='.hash_hmac('sha256', $body, self::PLATFORM_SECRET),
        ], $body)->assertOk();

        $message->refresh();
        $this->assertSame(['delivered', 'marketing', true], [$message->status, $message->pricing_category, $message->billable]);
    }

    public function test_report_estimates_meta_cost_from_saved_rates(): void
    {
        $conversation = WhatsAppConversation::create(['phone' => '966551234567']);
        $create = fn (string $category, bool $billable) => $conversation->messages()->create([
            'direction' => 'out', 'provider' => 'meta', 'status' => 'delivered', 'pricing_category' => $category, 'billable' => $billable,
        ]);
        $create('marketing', true);
        $create('marketing', true);
        $create('utility', true);
        $create('service', false);

        $this->actingAs($this->admin, 'employee')->putJson(route('api.v1.whatsapp.settings.update'), [
            'settings' => ['pricing' => ['rates' => ['marketing' => 0.2, 'utility' => 0.05, 'authentication' => 0.05]]],
        ])->assertOk();

        $kpis = collect($this->actingAs($this->admin, 'employee')->getJson(route('api.v1.reports.section', ['section' => 'whatsapp']))->assertOk()->json('data.kpis'))->keyBy('key');

        $this->assertSame(3, $kpis['billable']['value']);
        $this->assertEquals(0.45, $kpis['estimated_cost']['value']);
        $this->assertSame(1, WhatsAppMessage::query()->where('billable', false)->count());
    }

    public function test_pricing_rates_are_validated(): void
    {
        $this->actingAs($this->admin, 'employee')->putJson(route('api.v1.whatsapp.settings.update'), [
            'settings' => ['pricing' => ['rates' => ['marketing' => -1, 'free_lunch' => 1]]],
        ])->assertUnprocessable()->assertJsonValidationErrors(['settings.pricing.rates', 'settings.pricing.rates.marketing']);
    }
}
