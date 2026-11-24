<?php

declare(strict_types=1);

namespace Tests\Feature\Modules;

use App\Models\Brand;
use App\Models\Car;
use App\Models\Employee;
use App\Models\Lead;
use App\Models\Setting;
use App\Modules\AiAssistant\Contracts\LlmProvider;
use App\Modules\AiAssistant\Services\AssistantSettings;
use App\Modules\AiAssistant\Support\LlmResult;
use App\Modules\WhatsApp\Models\WhatsAppConversation;
use App\Modules\WhatsApp\Models\WhatsAppMessage;
use App\Modules\WhatsApp\Services\InboundProcessor;
use App\Modules\WhatsApp\Services\WhatsAppSettings;
use App\Services\TwilioWhatsAppService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class WhatsAppTest extends TestCase
{
    use RefreshDatabase;

    private const APP_SECRET = 'meta-app-secret';

    private const TWILIO_TOKEN = 'twilio-auth-token';

    protected function setUp(): void
    {
        parent::setUp();
        Http::preventStrayRequests();
    }

    private function settings(): WhatsAppSettings
    {
        return app(WhatsAppSettings::class)->fresh();
    }

    private function connectMeta(array $values = []): void
    {
        $this->settings()->update(array_replace_recursive([
            'provider' => 'meta',
            'meta' => ['phone_number_id' => '1234567890'],
        ], $values), ['meta' => ['access_token' => 'EAAG-token', 'app_secret' => self::APP_SECRET]]);
        $this->settings();
    }

    private function fakeMetaSend(string $id = 'wamid.OUT1'): void
    {
        Http::fake(['graph.facebook.com/*' => Http::response(['messaging_product' => 'whatsapp', 'messages' => [['id' => $id]]])]);
    }

    private function metaWebhook(array $value): TestResponse
    {
        $body = json_encode(['object' => 'whatsapp_business_account', 'entry' => [['changes' => [['field' => 'messages', 'value' => $value]]]]], JSON_UNESCAPED_UNICODE);

        return $this->call('POST', route('whatsapp.webhook.meta'), [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_HUB_SIGNATURE_256' => 'sha256='.hash_hmac('sha256', $body, self::APP_SECRET),
        ], $body);
    }

    private function inboundValue(string $from = '966551234567', string $text = 'السلام عليكم', string $id = 'wamid.IN1'): array
    {
        return [
            'contacts' => [['wa_id' => $from, 'profile' => ['name' => 'محمد']]],
            'messages' => [['from' => $from, 'id' => $id, 'timestamp' => (string) time(), 'type' => 'text', 'text' => ['body' => $text]]],
        ];
    }

    public function test_core_notifications_go_through_meta_with_logging(): void
    {
        $this->connectMeta();
        $this->fakeMetaSend();

        $id = app(TwilioWhatsAppService::class)->sendWhatsApp('0551234567', 'مرحبا محمد', 'booking_created', ['customer_name' => 'محمد', 'car_name' => 'كامري']);

        $this->assertSame('wamid.OUT1', $id);
        Http::assertSent(fn (HttpRequest $r) => str_ends_with($r->url(), '/v23.0/1234567890/messages')
            && $r->hasHeader('Authorization', 'Bearer EAAG-token')
            && $r['to'] === '966551234567'
            && $r['type'] === 'text'
            && $r['text']['body'] === 'مرحبا محمد');

        $message = WhatsAppMessage::firstOrFail();
        $this->assertSame(['out', 'sent', 'booking_created'], [$message->direction, $message->status, $message->event]);
        $this->assertSame('محمد', $message->conversation->name);
    }

    public function test_notification_uses_approved_meta_template_with_ordered_params(): void
    {
        $this->connectMeta(['notifications' => ['booking_status_updated' => [
            'template_name' => 'booking_status', 'template_language' => 'ar', 'template_params' => ['customer_name', 'status'],
        ]]]);
        $this->fakeMetaSend();

        app(TwilioWhatsAppService::class)->sendWhatsApp('0551234567', 'نص قديم', 'booking_status_updated', ['customer_name' => 'سارة', 'car_name' => 'سوناتا', 'status' => 'تمت الموافقة']);

        Http::assertSent(fn (HttpRequest $r) => $r['type'] === 'template'
            && $r['template']['name'] === 'booking_status'
            && $r['template']['language']['code'] === 'ar'
            && $r['template']['components'][0]['parameters'] === [['type' => 'text', 'text' => 'سارة'], ['type' => 'text', 'text' => 'تمت الموافقة']]);
        $this->assertSame('template', WhatsAppMessage::firstOrFail()->type);
    }

    public function test_showroom_text_overrides_core_text_and_disabled_events_are_skipped(): void
    {
        $this->connectMeta(['notifications' => [
            'booking_created' => ['text' => 'أهلاً {customer_name}، استلمنا طلب {car_name}'],
            'campaign' => ['enabled' => false],
        ]]);
        $this->fakeMetaSend();

        app(TwilioWhatsAppService::class)->sendWhatsApp('0551234567', 'نص النواة', 'booking_created', ['customer_name' => 'علي', 'car_name' => 'إلنترا']);
        $this->assertFalse(app(TwilioWhatsAppService::class)->sendWhatsApp('0551234567', 'حملة', 'campaign', ['name' => 'علي']));

        Http::assertSentCount(1);
        Http::assertSent(fn (HttpRequest $r) => $r['text']['body'] === 'أهلاً علي، استلمنا طلب إلنترا');
    }

    public function test_legacy_twilio_settings_are_imported_and_sent_with_content_template(): void
    {
        Setting::create(['key' => 'twilio_sid', 'value' => 'ACtest']);
        Setting::create(['key' => 'twilio_auth_token', 'value' => self::TWILIO_TOKEN]);
        Setting::create(['key' => 'twilio_whatsapp_number', 'value' => 'whatsapp:+14155238886']);
        Setting::create(['key' => 'whatsapp_template_new_lead', 'value' => 'مرحبا {customer_name}']);

        $settings = $this->settings();
        $this->assertSame('twilio', $settings->provider());
        $this->assertTrue($settings->isConfigured());
        $this->assertSame('مرحبا {customer_name}', $settings->get('notifications.booking_created.text'));

        $settings->update(['notifications' => ['booking_created' => ['twilio_content_sid' => 'HX'.str_repeat('a', 32), 'template_params' => ['customer_name', 'car_name']]]]);
        Http::fake(['api.twilio.com/*' => Http::response(['sid' => 'SM123', 'status' => 'queued'], 201)]);

        $id = app(TwilioWhatsAppService::class)->sendWhatsApp('0551234567', 'x', 'booking_created', ['customer_name' => 'محمد', 'car_name' => 'كامري']);

        $this->assertSame('SM123', $id);
        Http::assertSent(fn (HttpRequest $r) => str_ends_with($r->url(), '/Accounts/ACtest/Messages.json')
            && $r['From'] === 'whatsapp:+14155238886'
            && $r['To'] === 'whatsapp:+966551234567'
            && $r['ContentSid'] === 'HX'.str_repeat('a', 32)
            && json_decode($r['ContentVariables'], true) === ['1' => 'محمد', '2' => 'كامري']
            && $r->hasHeader('Authorization', 'Basic '.base64_encode('ACtest:'.self::TWILIO_TOKEN)));
    }

    public function test_meta_webhook_verification(): void
    {
        $token = $this->settings()->get('meta.verify_token');

        $this->get(route('whatsapp.webhook.meta.verify', ['hub.mode' => 'subscribe', 'hub.verify_token' => $token, 'hub.challenge' => '12345']))
            ->assertOk()->assertSee('12345');
        $this->get(route('whatsapp.webhook.meta.verify', ['hub.mode' => 'subscribe', 'hub.verify_token' => 'wrong', 'hub.challenge' => '1']))
            ->assertForbidden();
    }

    public function test_inbound_message_is_stored_linked_to_new_lead_and_deduplicated(): void
    {
        $this->connectMeta();

        $this->metaWebhook($this->inboundValue())->assertOk();
        $this->metaWebhook($this->inboundValue())->assertOk(); // provider retry

        $conversation = WhatsAppConversation::firstOrFail();
        $this->assertSame('966551234567', $conversation->phone);
        $this->assertSame(1, $conversation->unread_count);
        $this->assertTrue($conversation->isWithinServiceWindow());
        $this->assertSame(1, WhatsAppMessage::where('direction', 'in')->count());

        $lead = Lead::findOrFail($conversation->lead_id);
        $this->assertSame('محمد', $lead->client_name);
        $this->assertSame(InboundProcessor::LEAD_SOURCE, $lead->contactSource->name);
    }

    public function test_inbound_message_links_existing_lead_by_local_phone(): void
    {
        $this->connectMeta();
        $existing = Lead::factory()->create(['client_phone' => '0551234567']);
        $existingPhone = $existing->fresh()->client_phone;

        $this->metaWebhook($this->inboundValue())->assertOk();

        $this->assertSame(1, Lead::where('client_phone', $existingPhone)->count());
        $this->assertSame($existing->id, WhatsAppConversation::firstOrFail()->lead_id);
    }

    public function test_status_webhooks_advance_delivery_status_without_going_back(): void
    {
        $this->connectMeta();
        $this->fakeMetaSend('wamid.X');
        app(TwilioWhatsAppService::class)->sendWhatsApp('0551234567', 'test');

        $this->metaWebhook(['statuses' => [['id' => 'wamid.X', 'status' => 'read']]])->assertOk();
        $this->metaWebhook(['statuses' => [['id' => 'wamid.X', 'status' => 'delivered']]])->assertOk();

        $this->assertSame('read', WhatsAppMessage::firstOrFail()->status);
    }

    public function test_webhook_with_invalid_signature_is_rejected(): void
    {
        $this->connectMeta();

        $this->postJson(route('whatsapp.webhook.meta'), ['entry' => []], ['X-Hub-Signature-256' => 'sha256=bad'])->assertUnauthorized();
        $this->assertSame(0, WhatsAppMessage::count());
    }

    public function test_twilio_inbound_with_valid_signature_returns_twiml(): void
    {
        $this->settings()->update(['provider' => 'twilio', 'twilio' => ['account_sid' => 'ACx', 'from_number' => '+14155238886']], ['twilio' => ['auth_token' => self::TWILIO_TOKEN]]);
        $params = ['From' => 'whatsapp:+966551234567', 'Body' => 'كم سعر الكامري؟', 'MessageSid' => 'SMin1', 'ProfileName' => 'خالد', 'NumMedia' => '0'];

        $url = route('whatsapp.webhook.twilio');
        $data = $url;
        ksort($params);
        foreach ($params as $key => $value) {
            $data .= $key.$value;
        }
        $signature = base64_encode(hash_hmac('sha1', $data, self::TWILIO_TOKEN, true));

        $this->post($url, $params, ['X-Twilio-Signature' => $signature])
            ->assertOk()
            ->assertHeader('Content-Type', 'text/xml; charset=UTF-8');
        $this->assertSame('كم سعر الكامري؟', WhatsAppMessage::firstOrFail()->body);

        $this->post($url, $params + ['MessageSid' => 'SMin2'], ['X-Twilio-Signature' => 'bad'])->assertUnauthorized();
    }

    public function test_static_auto_reply_is_sent_once_per_12_hours(): void
    {
        $this->connectMeta(['inbound' => ['auto_reply' => 'static', 'static_reply' => 'هلا! بنرد عليك قريب']]);
        $this->fakeMetaSend();

        $this->metaWebhook($this->inboundValue(id: 'wamid.A'))->assertOk();
        $this->metaWebhook($this->inboundValue(text: 'ثانية', id: 'wamid.B'))->assertOk();

        Http::assertSentCount(1);
        $this->assertSame('auto_reply', WhatsAppMessage::where('direction', 'out')->firstOrFail()->event);
    }

    public function test_ai_assistant_answers_whatsapp_messages_with_car_links(): void
    {
        $this->connectMeta(['inbound' => ['auto_reply' => 'ai']]);
        app(AssistantSettings::class)->update([], 'AIzaKey1234');
        app(AssistantSettings::class)->fresh();

        $brand = Brand::factory()->create();
        Car::factory()->create(['brand_id' => $brand->id, 'name' => ['ar' => 'كامري', 'en' => 'Camry'], 'slug' => ['ar' => 'camry', 'en' => 'camry'], 'cash_price' => 120000, 'min_installment' => 2000]);

        $this->app->instance(LlmProvider::class, new ScriptedCarSearchProvider);
        $this->fakeMetaSend('wamid.AI');

        $this->metaWebhook($this->inboundValue(text: 'أبغى سيارة سيدان'))->assertOk();

        Http::assertSent(fn (HttpRequest $r) => $r['type'] === 'text'
            && str_contains($r['text']['body'], 'عندنا كامري تناسبك')
            && str_contains($r['text']['body'], url('/cars/camry')));
        $this->assertSame('ai_reply', WhatsAppMessage::where('direction', 'out')->firstOrFail()->event);
        $this->assertNotNull(WhatsAppConversation::firstOrFail()->assistant_session_id);
    }

    public function test_agent_reply_pauses_ai_and_respects_the_24h_window(): void
    {
        $admin = Employee::factory()->admin()->create();
        $this->connectMeta(['inbound' => ['human_pause_hours' => 6]]);
        $this->fakeMetaSend();

        $conversation = WhatsAppConversation::create(['phone' => '966551234567', 'last_inbound_at' => now()->subHours(30)]);
        $this->actingAs($admin, 'employee')
            ->postJson(route('api.v1.whatsapp.conversations.reply', $conversation), ['text' => 'هلا'])
            ->assertStatus(422);

        $conversation->update(['last_inbound_at' => now()->subHour()]);
        $this->actingAs($admin, 'employee')
            ->postJson(route('api.v1.whatsapp.conversations.reply', $conversation), ['text' => 'هلا، كيف أخدمك؟'])
            ->assertOk();

        $conversation->refresh();
        $this->assertTrue($conversation->ai_paused_until->between(now()->addHours(5), now()->addHours(7)));
        $this->assertSame($admin->id, WhatsAppMessage::where('event', 'agent_reply')->firstOrFail()->sent_by);
    }

    public function test_admin_settings_hide_secrets_and_require_admin(): void
    {
        $admin = Employee::factory()->admin()->create();
        $this->connectMeta();

        $response = $this->actingAs($admin, 'employee')->getJson(route('api.v1.whatsapp.settings'))->assertOk();
        $this->assertStringNotContainsString('EAAG-token', $response->getContent());
        $this->assertStringNotContainsString(self::APP_SECRET, $response->getContent());
        $response->assertJsonPath('data.secrets.meta.access_token.configured', true)
            ->assertJsonPath('data.configured', true)
            ->assertJsonPath('data.webhooks.meta', route('whatsapp.webhook.meta'));

        $this->actingAs($admin, 'employee')->putJson(route('api.v1.whatsapp.settings.update'), [
            'settings' => ['inbound' => ['auto_reply' => 'static'], 'notifications' => ['booking_created' => ['template_name' => 'new_booking']]],
            'secrets' => ['meta' => ['access_token' => null]],
        ])->assertOk()
            ->assertJsonPath('data.settings.inbound.auto_reply', 'static')
            ->assertJsonPath('data.settings.notifications.booking_created.template_name', 'new_booking')
            ->assertJsonPath('data.secrets.meta.access_token.configured', true);

        $this->actingAs(Employee::factory()->create(), 'employee')->getJson(route('api.v1.whatsapp.settings'))->assertForbidden();
    }

    public function test_without_connection_the_legacy_path_is_used(): void
    {
        $this->assertFalse($this->settings()->isConfigured());
        $this->assertFalse(app(TwilioWhatsAppService::class)->sendWhatsApp('0551234567', 'test', 'booking_created'));
        $this->assertSame(0, WhatsAppMessage::count());
    }
}

/**
 * Scripted AI provider (kept outside the TestCase so Pint's test-method casing never renames testConnection).
 * First call asks for search_cars, second call answers with text.
 */
class ScriptedCarSearchProvider implements LlmProvider
{
    private int $calls = 0;

    public function name(): string
    {
        return 'fake';
    }

    public function generate(string $system, array $contents, array $tools, array $options = []): LlmResult
    {
        return $this->calls++ === 0
            ? new LlmResult('', [['id' => null, 'name' => 'search_cars', 'args' => []]], [['functionCall' => ['name' => 'search_cars', 'args' => []]]])
            : new LlmResult('عندنا كامري تناسبك 👇', [], [['text' => 'عندنا كامري تناسبك 👇']]);
    }

    public function testConnection(?string $apiKey = null): array
    {
        return ['ok' => true, 'message' => 'ok', 'models' => []];
    }
}
