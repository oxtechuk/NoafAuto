<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Models\Booking;
use App\Models\Brand;
use App\Models\Car;
use App\Models\Employee;
use App\Models\Lead;
use App\Models\Task;
use App\Modules\AiAssistant\Models\AssistantConversation;
use App\Modules\WhatsApp\Models\WhatsAppConversation;
use App\Services\Reports\ReportMetrics;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class ReportSectionsApiTest extends TestCase
{
    use RefreshDatabase;

    private Employee $admin;

    private Employee $sales;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::findOrCreate('manage-reports', 'employee');
        $this->admin = Employee::factory()->admin()->create();
        $this->sales = Employee::factory()->create();
    }

    private function report(Employee $as, string $section, array $params = []): TestResponse
    {
        return $this->actingAs($as, 'employee')->getJson(route('api.v1.reports.section', ['section' => $section, ...$params]));
    }

    /**
     * @return array<string, mixed>
     */
    private function kpis(TestResponse $response): array
    {
        return collect($response->json('data.kpis'))->keyBy('key')->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function rows(TestResponse $response, string $table): array
    {
        return collect($response->json('data.tables'))->firstWhere('key', $table)['rows'];
    }

    public function test_guest_and_unknown_sections_are_rejected(): void
    {
        $this->getJson(route('api.v1.reports.sections'))->assertUnauthorized();
        $this->report($this->admin, 'nope')->assertNotFound();
    }

    public function test_won_and_lost_come_from_the_status_flags(): void
    {
        $this->assertContains('received', ReportMetrics::wonStatuses());
        $this->assertContains('sold', ReportMetrics::wonStatuses());
        $this->assertContains('lost_no_answer', ReportMetrics::lostStatuses());
        $this->assertNotContains('approved', ReportMetrics::wonStatuses());
    }

    public function test_admin_sees_every_section_including_enabled_modules(): void
    {
        $keys = collect($this->actingAs($this->admin, 'employee')->getJson(route('api.v1.reports.sections'))
            ->assertOk()
            ->assertJsonPath('data.can_view_all', true)
            ->json('data.sections'))->pluck('key')->all();

        $this->assertSame(['overview', 'team', 'cars', 'brands', 'channels', 'crm', 'trend', 'whatsapp', 'ai-assistant'], $keys);
    }

    public function test_every_section_builds_on_an_empty_and_a_filled_database(): void
    {
        $sections = collect($this->actingAs($this->admin, 'employee')->getJson(route('api.v1.reports.sections'))->json('data.sections'))->pluck('key');

        foreach ($sections as $section) {
            $this->report($this->admin, $section)->assertOk()->assertJsonStructure(['data' => ['kpis', 'charts', 'tables', 'range']]);
        }

        Booking::factory()->count(3)->assignedTo($this->sales)->create(['status' => 'received', 'net_commission' => 1000, 'delivered_at' => now()]);
        Booking::factory()->create(['status' => 'lost_no_answer', 'utm_source' => 'tiktok']);
        Task::create(['title' => 'اتصل', 'status' => 'new', 'priority' => 'high', 'assigned_to' => $this->sales->id, 'due_date' => now()->subDays(2), 'created_by' => $this->admin->id]);

        foreach ($sections as $section) {
            $this->report($this->admin, $section, ['fresh' => 1])->assertOk();
        }
    }

    public function test_overview_win_rate_ignores_open_bookings_and_compares_with_the_previous_period(): void
    {
        Booking::factory()->count(2)->create(['status' => 'received', 'net_commission' => 1500, 'created_at' => now()->subDays(3), 'delivered_at' => now()->subDay()]);
        Booking::factory()->create(['status' => 'lost_no_answer', 'created_at' => now()->subDays(3)]);
        Booking::factory()->count(5)->create(['status' => 'new', 'created_at' => now()->subDays(3)]);
        // Previous 30 days: one won booking.
        Booking::factory()->create(['status' => 'received', 'created_at' => now()->subDays(45)]);
        // Outside both periods.
        Booking::factory()->create(['status' => 'received', 'created_at' => now()->subDays(200)]);

        $kpis = $this->kpis($this->report($this->admin, 'overview')->assertOk());

        $this->assertSame(8, $kpis['bookings']['value']);
        $this->assertSame(2, $kpis['won']['value']);
        $this->assertSame(1, $kpis['lost']['value']);
        $this->assertEquals(66.7, $kpis['win_rate']['value']);
        $this->assertEquals(25.0, $kpis['conversion_rate']['value']);
        $this->assertEquals(3000, $kpis['commission']['value']);
        $this->assertEquals(2.0, $kpis['avg_close_days']['value']);
        $this->assertSame(1, $kpis['won']['previous']);
        $this->assertEquals(100.0, $kpis['won']['change']);
        $this->assertSame(10, $kpis['leads']['value']); // every booking creates its lead now (not back-dated)
    }

    public function test_custom_range_and_all_time(): void
    {
        Booking::factory()->create(['created_at' => '2026-01-10 12:00:00']);
        Booking::factory()->create(['created_at' => now()]);

        $range = $this->report($this->admin, 'overview', ['from' => '2026-01-01', 'to' => '2026-01-31'])->assertOk();
        $this->assertSame(1, $this->kpis($range)['bookings']['value']);
        $range->assertJsonPath('data.range.previous_from', '2025-12-01');

        $this->assertSame(2, $this->kpis($this->report($this->admin, 'overview', ['all' => 1]))['bookings']['value']);
        $this->report($this->admin, 'overview', ['from' => '2026-02-01', 'to' => '2026-01-01'])->assertUnprocessable();
    }

    public function test_sales_without_permission_only_get_their_own_numbers(): void
    {
        Booking::factory()->count(2)->assignedTo($this->sales)->create(['status' => 'received']);
        Booking::factory()->count(3)->assignedTo($this->admin)->create(['status' => 'received']);

        $sections = $this->actingAs($this->sales, 'employee')->getJson(route('api.v1.reports.sections'))
            ->assertOk()
            ->assertJsonPath('data.can_view_all', false)
            ->assertJsonPath('data.employees', [])
            ->json('data.sections');
        $this->assertNotContains('ai-assistant', array_column($sections, 'key'));

        $this->assertSame(2, $this->kpis($this->report($this->sales, 'overview', ['employee_id' => $this->admin->id]))['won']['value']);
        $this->assertCount(1, $this->rows($this->report($this->sales, 'team'), 'team'));
        $this->report($this->sales, 'ai-assistant')->assertNotFound();

        $this->sales->givePermissionTo('manage-reports');
        $this->assertSame(5, $this->kpis($this->report($this->sales->fresh(), 'overview'))['won']['value']);
        $this->assertSame(3, $this->kpis($this->report($this->sales->fresh(), 'overview', ['employee_id' => $this->admin->id]))['won']['value']);
    }

    public function test_team_report_per_employee(): void
    {
        Booking::factory()->count(2)->assignedTo($this->sales)->create(['status' => 'received', 'net_commission' => 500]);
        Booking::factory()->assignedTo($this->sales)->create(['status' => 'lost_no_answer']);
        Booking::factory()->assignedTo($this->sales)->create(['status' => 'new', 'follow_up_at' => now()->subDay()]);
        Task::create(['title' => 'متابعة', 'status' => 'new', 'priority' => 'high', 'assigned_to' => $this->sales->id, 'due_date' => now()->subDays(2), 'created_by' => $this->admin->id]);

        $response = $this->report($this->admin, 'team')->assertOk();
        $row = collect($this->rows($response, 'team'))->firstWhere('employee_id', $this->sales->id);

        $this->assertSame([4, 2, 1, 1000.0, 1, 1, 1], [$row['bookings'], $row['won'], $row['lost'], (float) $row['commission'], $row['overdue_followups'], $row['open_tasks'], $row['overdue_tasks']]);
        $this->assertEquals(66.7, $row['win_rate']);
        $this->assertSame(1, $this->kpis($response)['overdue_followups']['value']);
    }

    public function test_cars_and_brands_reports_and_brand_filter(): void
    {
        $toyota = Brand::factory()->create(['name' => ['ar' => 'تويوتا', 'en' => 'Toyota']]);
        $kia = Brand::factory()->create(['name' => ['ar' => 'كيا', 'en' => 'Kia']]);
        $camry = Car::factory()->create(['brand_id' => $toyota->id, 'name' => ['ar' => 'كامري', 'en' => 'Camry'], 'views' => 200, 'is_active' => true]);
        $k5 = Car::factory()->create(['brand_id' => $kia->id, 'name' => ['ar' => 'كي 5', 'en' => 'K5'], 'views' => 900, 'is_active' => true]);
        Booking::factory()->count(3)->create(['car_id' => $camry->id, 'status' => 'received']);
        Booking::factory()->create(['car_id' => $k5->id]);

        $cars = $this->report($this->admin, 'cars')->assertOk();
        $camryRow = collect($this->rows($cars, 'cars'))->firstWhere('car_id', $camry->id);
        $this->assertSame(['كامري', 'تويوتا', 200, 3, 3], [$camryRow['name'], $camryRow['brand'], $camryRow['views'], $camryRow['bookings'], $camryRow['won']]);
        $this->assertEquals(1.5, $camryRow['view_to_booking']);
        $this->assertSame([$k5->id], array_column($this->rows($cars, 'opportunities'), 'car_id'));

        $brands = collect($this->rows($this->report($this->admin, 'brands'), 'brands'))->keyBy('brand_id');
        $this->assertSame(3, $brands[$toyota->id]['won']);
        $this->assertSame(900, $brands[$kia->id]['views']);

        $this->assertSame(3, $this->kpis($this->report($this->admin, 'overview', ['brand_id' => $toyota->id]))['bookings']['value']);
    }

    public function test_channels_merge_stored_and_resolved_attribution(): void
    {
        Booking::factory()->create(['marketing_channel' => 'Meta (Instagram / Facebook)', 'status' => 'received', 'utm_campaign' => 'ramadan']);
        Booking::factory()->create(['marketing_channel' => null, 'utm_source' => 'instagram', 'status' => 'lost_no_answer', 'utm_campaign' => 'ramadan']);
        Booking::factory()->create(['marketing_channel' => null, 'click_id' => 'gclid.ABC123']);
        Booking::factory()->create(['marketing_channel' => null, 'click_id' => 'gclid.XYZ789']);

        $response = $this->report($this->admin, 'channels')->assertOk();
        $channels = collect($this->rows($response, 'channels'))->keyBy('channel');

        $this->assertSame([2, 1, 1], [$channels['Meta (Instagram / Facebook)']['bookings'], $channels['Meta (Instagram / Facebook)']['won'], $channels['Meta (Instagram / Facebook)']['lost']]);
        $this->assertSame(2, $channels['Google Ads']['bookings']);
        $this->assertSame(2, $this->rows($response, 'campaigns')[0]['bookings']);
        $this->assertEquals(100.0, $this->kpis($response)['paid_share']['value']);
    }

    public function test_trend_covers_twelve_months(): void
    {
        Booking::factory()->create(['status' => 'received', 'created_at' => now()->subMonths(2)]);

        $rows = $this->rows($this->report($this->admin, 'trend')->assertOk(), 'monthly');

        $this->assertCount(12, $rows);
        $this->assertSame(1, array_sum(array_column($rows, 'won')));
    }

    public function test_crm_report(): void
    {
        Lead::factory()->count(2)->create(['status' => 'converted']);
        Lead::factory()->create();

        $kpis = $this->kpis($this->report($this->admin, 'crm')->assertOk());

        $this->assertSame([3, 2], [$kpis['leads']['value'], $kpis['leads_converted']['value']]);
    }

    public function test_whatsapp_and_ai_assistant_sections(): void
    {
        $conversation = WhatsAppConversation::create(['phone' => '966551234567', 'assigned_to' => $this->sales->id, 'status' => 'pending', 'tags' => ['تمويل']]);
        $conversation->messages()->create(['direction' => 'in', 'provider' => 'meta', 'body' => 'هلا', 'status' => 'received']);
        $conversation->messages()->create(['direction' => 'out', 'provider' => 'meta', 'body' => 'أهلاً', 'event' => 'agent_reply', 'status' => 'read', 'sent_by' => $this->sales->id]);
        $conversation->messages()->create(['direction' => 'out', 'provider' => 'meta', 'body' => 'x', 'event' => 'ai_reply', 'status' => 'failed']);

        $whatsapp = $this->report($this->admin, 'whatsapp')->assertOk();
        $kpis = $this->kpis($whatsapp);
        $this->assertSame([1, 1, 1, 1], [$kpis['inbound']['value'], $kpis['agent_replies']['value'], $kpis['auto_replies']['value'], $kpis['failed']['value']]);
        $this->assertEquals(100.0, $kpis['read_rate']['value']);
        $team = collect($this->rows($whatsapp, 'team'))->firstWhere('name', $this->sales->name);
        $this->assertSame([1, 1, 1], [$team['conversations'], $team['pending'], $team['replies']]);
        $this->assertSame('تمويل', collect($whatsapp->json('data.charts'))->firstWhere('key', 'tags')['points'][0]['label']);

        $this->assertSame(0, $this->kpis($this->report($this->admin, 'whatsapp', ['employee_id' => $this->admin->id]))['inbound']['value']);

        $ai = AssistantConversation::create(['session_id' => (string) Str::uuid(), 'channel' => 'storefront', 'lead_id' => Lead::factory()->create()->id]);
        $ai->messages()->create(['role' => 'user', 'content' => 'سيدان؟']);
        $ai->messages()->create(['role' => 'model', 'content' => 'عندنا كامري', 'latency_ms' => 1500, 'tokens_in' => 100, 'tokens_out' => 20]);

        $kpis = $this->kpis($this->report($this->admin, 'ai-assistant')->assertOk());
        $this->assertSame([1, 1, 1, 120], [$kpis['conversations']['value'], $kpis['replies']['value'], $kpis['leads']['value'], $kpis['tokens']['value']]);
        $this->assertEquals(1.5, $kpis['avg_latency']['value']);
    }

    public function test_results_are_cached_until_refreshed(): void
    {
        Booking::factory()->create();
        $this->assertSame(1, $this->kpis($this->report($this->admin, 'overview'))['bookings']['value']);

        Booking::factory()->create();
        $this->assertSame(1, $this->kpis($this->report($this->admin, 'overview'))['bookings']['value']);
        $this->assertSame(2, $this->kpis($this->report($this->admin, 'overview', ['fresh' => 1]))['bookings']['value']);
    }

    public function test_table_export_is_a_utf8_csv(): void
    {
        Booking::factory()->assignedTo($this->sales)->create(['status' => 'received']);

        $response = $this->actingAs($this->admin, 'employee')
            ->get(route('api.v1.reports.export', ['section' => 'team', 'table' => 'team']))
            ->assertOk()
            ->assertHeader('Content-Type', 'text/csv; charset=UTF-8');

        $csv = $response->streamedContent();
        $this->assertStringStartsWith("\xEF\xBB\xBF", $csv);
        $this->assertStringContainsString('الموظف', $csv);
        $this->assertStringContainsString($this->sales->name, $csv);
    }
}
