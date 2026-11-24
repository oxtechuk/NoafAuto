<?php

declare(strict_types=1);

namespace Tests\Feature\Modules;

use App\Models\Brand;
use App\Models\CalculatorBank;
use App\Models\Car;
use App\Models\Employee;
use App\Models\Lead;
use App\Modules\AiAssistant\Contracts\LlmProvider;
use App\Modules\AiAssistant\Models\AssistantConversation;
use App\Modules\AiAssistant\Models\AssistantMessage;
use App\Modules\AiAssistant\Providers\GeminiProvider;
use App\Modules\AiAssistant\Services\AssistantSettings;
use App\Modules\AiAssistant\Support\LlmResult;
use App\Modules\AiAssistant\Tools\CreateLeadTool;
use App\Services\CalculatorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Tests\TestCase;

class AiAssistantTest extends TestCase
{
    use RefreshDatabase;

    private FakeLlmProvider $fake;

    private Car $car;

    protected function setUp(): void
    {
        parent::setUp();

        $this->fake = new FakeLlmProvider;
        $this->app->instance(LlmProvider::class, $this->fake);

        $brand = Brand::factory()->create(['name' => ['ar' => 'تويوتا', 'en' => 'Toyota'], 'slug' => 'toyota']);
        $this->car = Car::factory()->create([
            'brand_id' => $brand->id,
            'name' => ['ar' => 'كامري 2025', 'en' => 'Camry 2025'],
            'slug' => ['ar' => 'camry-2025', 'en' => 'camry-2025'],
            'cash_price' => 125000,
            'min_installment' => 2100,
            'type' => 'sedan',
            'specs' => ['hp' => '203 hp', 'fuel' => 'petrol'],
        ]);
        CalculatorBank::create(['name' => 'بنك الراجحي', 'annual_rate' => 4.5, 'sort_order' => 1, 'is_active' => true]);
        RateLimiter::clear('ai-assistant:ip:'.sha1('127.0.0.1'));
    }

    private function connect(array $settings = []): void
    {
        app(AssistantSettings::class)->update($settings, 'AIzaTestKey1234');
        app(AssistantSettings::class)->fresh();
    }

    public function test_widget_is_disabled_until_the_showroom_connects_its_key(): void
    {
        $this->getJson(route('v1.store.api.assistant.config'))->assertOk()->assertJsonPath('data.enabled', false);
        $this->postJson(route('v1.store.api.assistant.chat'), ['message' => 'هلا'])->assertStatus(503);

        $this->connect();

        $this->getJson(route('v1.store.api.assistant.config'))
            ->assertOk()
            ->assertJsonPath('data.enabled', true)
            ->assertJsonPath('data.bubble_title', 'تبيها كاش ولا قسط؟');
    }

    public function test_chat_runs_tool_loop_and_returns_car_cards(): void
    {
        $this->connect();
        $this->fake->queue(new LlmResult('', [['id' => 'c1', 'name' => 'search_cars', 'args' => ['max_monthly_installment' => 2500]]], [['functionCall' => ['id' => 'c1', 'name' => 'search_cars', 'args' => ['max_monthly_installment' => 2500]], 'thoughtSignature' => 'sig-1']], 120, 10));
        $this->fake->queue(new LlmResult('أنصحك بكامري 2025، قسطها يبدأ من 2,100 ريال.', [], [['text' => 'أنصحك بكامري 2025، قسطها يبدأ من 2,100 ريال.']], 200, 30));

        $response = $this->postJson(route('v1.store.api.assistant.chat'), [
            'message' => 'أبغى سيارة قسطها أقل من 2500',
            'context' => ['path' => '/cars'],
        ])->assertOk();

        $response->assertJsonPath('data.cards.0.type', 'cars')
            ->assertJsonPath('data.cards.0.cars.0.slug', 'camry-2025')
            ->assertJsonPath('data.cards.0.cars.0.monthly_from', 2100);
        $this->assertStringContainsString('كامري', $response->json('data.reply'));

        // Second model call received the function result, and the thought signature was replayed unchanged.
        $secondCall = $this->fake->calls[1];
        $this->assertSame('sig-1', $secondCall['contents'][1]['parts'][0]['thoughtSignature']);
        $this->assertSame('search_cars', $secondCall['contents'][2]['parts'][0]['functionResponse']['name']);
        $this->assertSame('c1', $secondCall['contents'][2]['parts'][0]['functionResponse']['id']);

        $conversation = AssistantConversation::firstOrFail();
        $this->assertSame(4, $conversation->messages()->count());
        $this->assertSame(320, $conversation->tokens_in);
        $this->assertNull(AssistantMessage::where('role', 'model')->latest('id')->first()->guard_flags);
    }

    public function test_conversation_continues_with_history_by_session_id(): void
    {
        $this->connect();
        $this->fake->queue(new LlmResult('كاش ولا قسط؟', [], [['text' => 'كاش ولا قسط؟']]));
        $sessionId = $this->postJson(route('v1.store.api.assistant.chat'), ['message' => 'هلا'])->json('data.session_id');

        $this->fake->queue(new LlmResult('تمام، قسط.', [], [['text' => 'تمام، قسط.']]));
        $this->postJson(route('v1.store.api.assistant.chat'), ['session_id' => $sessionId, 'message' => 'قسط'])->assertOk();

        $contents = $this->fake->calls[1]['contents'];
        $this->assertCount(3, $contents);
        $this->assertSame('هلا', $contents[0]['parts'][0]['text']);
        $this->assertSame('model', $contents[1]['role']);
        $this->assertSame('قسط', $contents[2]['parts'][0]['text']);
    }

    public function test_system_prompt_reflects_showroom_rules_and_topics(): void
    {
        $this->connect([
            'assistant_name' => 'نوّاف',
            'allowed_topics' => ['cars', 'financing'],
            'custom_rules' => 'رشّح سيارات العروض أولاً',
            'tools' => ['create_lead' => false],
        ]);
        $this->fake->queue(new LlmResult('هلا', [], [['text' => 'هلا']]));

        $this->postJson(route('v1.store.api.assistant.chat'), ['message' => 'هلا'])->assertOk();

        $system = $this->fake->calls[0]['system'];
        $this->assertStringContainsString('نوّاف', $system);
        $this->assertStringContainsString('رشّح سيارات العروض أولاً', $system);
        $this->assertStringContainsString(AssistantSettings::TOPICS['financing'], $system);
        $this->assertStringNotContainsString(AssistantSettings::TOPICS['maintenance'], $system);
        $this->assertNotContains('create_lead', array_column($this->fake->calls[0]['tools'], 'name'));
    }

    public function test_blocked_keyword_is_answered_without_calling_the_model(): void
    {
        $this->connect(['blocked_keywords' => ['انتخابات']]);

        $this->postJson(route('v1.store.api.assistant.chat'), ['message' => 'وش رأيك في الانتخابات؟'])
            ->assertOk()
            ->assertJsonPath('data.reply', AssistantSettings::defaults()['off_topic_reply']);

        $this->assertSame([], $this->fake->calls);
    }

    public function test_create_lead_requires_consent_and_registers_in_crm(): void
    {
        $this->connect();
        $call = fn (bool $consent) => new LlmResult('', [['id' => null, 'name' => 'create_lead', 'args' => ['name' => 'محمد', 'phone' => '0551234567', 'car_slug' => 'camry-2025', 'summary' => 'سيدان قسط', 'consent' => $consent]]], [['functionCall' => ['name' => 'create_lead', 'args' => []]]]);

        $this->fake->queue($call(false));
        $this->fake->queue(new LlmResult('توافق على التواصل؟', [], [['text' => 'توافق على التواصل؟']]));
        $sessionId = $this->postJson(route('v1.store.api.assistant.chat'), ['message' => 'سجلني'])->json('data.session_id');
        $this->assertSame(0, Lead::count());

        $this->fake->queue($call(true));
        $this->fake->queue(new LlmResult('تم تسجيل طلبك!', [], [['text' => 'تم تسجيل طلبك!']]));
        $this->postJson(route('v1.store.api.assistant.chat'), ['session_id' => $sessionId, 'message' => 'أوافق'])
            ->assertOk()
            ->assertJsonPath('data.lead_registered', true)
            ->assertJsonPath('data.cards.0.type', 'lead_created');

        $lead = Lead::firstOrFail();
        $this->assertStringEndsWith('551234567', $lead->client_phone); // Lead normalizes to 9665…
        $this->assertSame($this->car->id, $lead->car_id);
        $this->assertSame(CreateLeadTool::SOURCE_NAME, $lead->contactSource->name);
        $this->assertSame($lead->id, AssistantConversation::firstOrFail()->lead_id);
    }

    public function test_installment_tool_uses_showroom_banks_and_salary_check(): void
    {
        $this->connect();
        $this->fake->queue(new LlmResult('', [['id' => null, 'name' => 'calculate_installment', 'args' => ['slug' => 'camry-2025', 'down_payment' => 25000, 'months' => 60, 'salary' => 9000, 'monthly_obligations' => 1000]]], [['functionCall' => ['name' => 'calculate_installment', 'args' => []]]]));
        $this->fake->queue(new LlmResult('القسط مناسب لراتبك.', [], [['text' => 'القسط مناسب لراتبك.']]));

        $card = $this->postJson(route('v1.store.api.assistant.chat'), ['message' => 'كم قسطها؟'])->assertOk()->json('data.cards.0');

        $cheapest = CalculatorBank::where('is_active', true)->orderBy('annual_rate')->firstOrFail();
        $expected = app(CalculatorService::class)->installment(125000, 20, 60, (float) $cheapest->annual_rate);

        $this->assertSame('installment', $card['type']);
        $this->assertSame((string) $cheapest->name, $card['best_option']['bank']);
        $this->assertEquals(round($expected['monthly']), $card['best_option']['monthly']);
        $this->assertSame(60, $card['months']);
        $this->assertEquals(1970, $card['eligibility']['max_affordable_installment']); // 9000 × 33% − 1000
        $this->assertSame($card['best_option']['monthly'] <= 1970, $card['eligibility']['fits_salary']);
    }

    public function test_invented_price_is_flagged_and_disclaimed(): void
    {
        $this->connect();
        $this->fake->queue(new LlmResult('سعرها 99,000 ريال فقط!', [], [['text' => 'سعرها 99,000 ريال فقط!']]));

        $reply = $this->postJson(route('v1.store.api.assistant.chat'), ['message' => 'كم سعر الكامري؟'])->assertOk()->json('data.reply');

        $this->assertStringContainsString(AssistantSettings::defaults()['finance_disclaimer'], $reply);
        $this->assertContains('unverified_number:99000', AssistantMessage::where('role', 'model')->latest('id')->first()->guard_flags);
    }

    public function test_session_message_limit(): void
    {
        $this->connect(['limits' => ['max_messages_per_session' => 5]]);
        $conversation = AssistantConversation::create(['session_id' => (string) Str::uuid(), 'messages_count' => 5]);

        $this->postJson(route('v1.store.api.assistant.chat'), ['session_id' => $conversation->session_id, 'message' => 'هلا'])
            ->assertOk()
            ->assertJsonPath('data.limit_reached', true);
        $this->assertSame([], $this->fake->calls);
    }

    public function test_hourly_ip_limit(): void
    {
        $this->connect(['limits' => ['max_messages_per_hour_per_ip' => 5]]);
        foreach (range(1, 5) as $i) {
            $this->fake->queue(new LlmResult('تمام', [], [['text' => 'تمام']]));
            $this->postJson(route('v1.store.api.assistant.chat'), ['message' => "رسالة {$i}"])->assertOk();
        }

        $this->postJson(route('v1.store.api.assistant.chat'), ['message' => 'رسالة 6'])->assertStatus(429);
    }

    public function test_admin_settings_never_expose_the_api_key(): void
    {
        $admin = Employee::factory()->admin()->create();
        $this->connect();

        $response = $this->actingAs($admin, 'employee')->getJson(route('api.v1.ai-assistant.settings'))->assertOk();
        $this->assertStringNotContainsString('AIzaTestKey1234', $response->getContent());
        $response->assertJsonPath('data.api_key.masked', '••••1234')->assertJsonPath('data.ready', true);

        $this->actingAs($admin, 'employee')->putJson(route('api.v1.ai-assistant.settings.update'), [
            'settings' => ['assistant_name' => 'نوّاف', 'allowed_topics' => ['cars'], 'tools' => ['create_lead' => false]],
        ])->assertOk()->assertJsonPath('data.settings.assistant_name', 'نوّاف')
            ->assertJsonPath('data.settings.allowed_topics', ['cars'])
            ->assertJsonPath('data.settings.tools.create_lead', false)
            ->assertJsonPath('data.api_key.configured', true);

        $this->actingAs(Employee::factory()->create(), 'employee')
            ->getJson(route('api.v1.ai-assistant.settings'))
            ->assertForbidden();
    }

    public function test_admin_can_view_conversation_transcript(): void
    {
        $admin = Employee::factory()->admin()->create();
        $this->connect();
        $this->fake->queue(new LlmResult('هلا والله', [], [['text' => 'هلا والله']]));
        $this->postJson(route('v1.store.api.assistant.chat'), ['message' => 'هلا'])->assertOk();

        $conversation = AssistantConversation::firstOrFail();
        $this->actingAs($admin, 'employee')->getJson(route('api.v1.ai-assistant.conversations'))->assertOk()->assertJsonPath('meta.total', 1);
        $this->actingAs($admin, 'employee')->getJson(route('api.v1.ai-assistant.conversations.show', $conversation))
            ->assertOk()
            ->assertJsonPath('data.messages.0.content', 'هلا')
            ->assertJsonPath('data.messages.1.content', 'هلا والله');
    }

    public function test_prune_deletes_conversations_older_than_retention(): void
    {
        $this->connect(['retention_days' => 30]);
        AssistantConversation::create(['session_id' => (string) Str::uuid(), 'last_activity_at' => now()->subDays(31)]);
        $recent = AssistantConversation::create(['session_id' => (string) Str::uuid(), 'last_activity_at' => now()->subDays(2)]);

        $this->artisan('ai-assistant:prune')->assertSuccessful();

        $this->assertSame([$recent->id], AssistantConversation::pluck('id')->all());
    }

    public function test_gemini_provider_request_and_response_mapping(): void
    {
        $this->app->forgetInstance(LlmProvider::class);
        $this->connect(['model' => 'gemini-3.8-flash']);
        Http::preventStrayRequests();
        Http::fake([
            'generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent' => Http::response([
                'candidates' => [['content' => ['role' => 'model', 'parts' => [
                    ['functionCall' => ['id' => 'abc', 'name' => 'search_cars', 'args' => ['fuel' => 'hybrid']], 'thoughtSignature' => 'xyz'],
                ]], 'finishReason' => 'STOP']],
                'usageMetadata' => ['promptTokenCount' => 50, 'candidatesTokenCount' => 7, 'thoughtsTokenCount' => 3],
            ]),
        ]);

        $result = app(GeminiProvider::class)->generate('system', [['role' => 'user', 'parts' => [['text' => 'هايبرد']]]], [['name' => 'search_cars', 'description' => 'd']], ['temperature' => 0.4, 'max_output_tokens' => 512]);

        $this->assertSame([['id' => 'abc', 'name' => 'search_cars', 'args' => ['fuel' => 'hybrid']]], $result->functionCalls);
        $this->assertSame('xyz', $result->rawParts[0]['thoughtSignature']);
        $this->assertSame(50, $result->tokensIn);
        $this->assertSame(10, $result->tokensOut);

        Http::assertSent(fn (HttpRequest $request) => $request->hasHeader('x-goog-api-key', 'AIzaTestKey1234')
            && $request['systemInstruction']['parts'][0]['text'] === 'system'
            && $request['tools'][0]['functionDeclarations'][0]['name'] === 'search_cars'
            && $request['toolConfig']['functionCallingConfig']['mode'] === 'AUTO'
            && $request['generationConfig']['maxOutputTokens'] === 512);
    }
}

/**
 * Scripted provider: returns queued results and records every call.
 */
class FakeLlmProvider implements LlmProvider
{
    /** @var list<LlmResult> */
    private array $queue = [];

    /** @var list<array{system: string, contents: array, tools: array, options: array}> */
    public array $calls = [];

    public function queue(LlmResult $result): void
    {
        $this->queue[] = $result;
    }

    public function name(): string
    {
        return 'fake';
    }

    public function generate(string $system, array $contents, array $tools, array $options = []): LlmResult
    {
        $this->calls[] = compact('system', 'contents', 'tools', 'options');

        return array_shift($this->queue) ?? new LlmResult('…', [], [['text' => '…']]);
    }

    public function testConnection(?string $apiKey = null): array
    {
        return ['ok' => true, 'message' => 'ok', 'models' => ['fake-model']];
    }
}
