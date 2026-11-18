<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Employee;
use App\Models\Lead;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Activitylog\Models\Activity;
use Tests\TestCase;

class ActivityLogAndBackupTest extends TestCase
{
    use RefreshDatabase;

    public function test_activity_is_logged_when_booking_is_updated(): void
    {
        $employee = Employee::factory()->create(['is_active' => true]);
        $booking = Booking::factory()->create([
            'client_name' => 'Original Customer',
            'status' => 'new',
            'assigned_to' => $employee->id,
        ]);

        $this->actingAs($employee, 'employee');

        $booking->update([
            'status' => 'contacted',
            'total_price' => 150000.00,
        ]);

        $activity = Activity::where('subject_type', Booking::class)
            ->where('subject_id', $booking->id)
            ->where('event', 'updated')
            ->first();

        $this->assertNotNull($activity);
        $this->assertEquals('updated', $activity->event);
        $this->assertEquals($booking->id, $activity->subject_id);
    }

    public function test_activity_is_logged_when_lead_is_updated(): void
    {
        $employee = Employee::factory()->create(['is_active' => true]);
        $lead = Lead::factory()->create([
            'client_name' => 'Initial Lead',
            'status' => 'new',
        ]);

        $this->actingAs($employee, 'employee');

        $lead->update([
            'client_name' => 'Renamed Lead',
            'status' => 'interested',
        ]);

        $activity = Activity::where('subject_type', Lead::class)
            ->where('subject_id', $lead->id)
            ->where('event', 'updated')
            ->first();

        $this->assertNotNull($activity);
        $this->assertEquals('updated', $activity->event);
        $this->assertEquals($lead->id, $activity->subject_id);
    }

    public function test_backup_list_artisan_command_is_registered(): void
    {
        $this->artisan('backup:list')
            ->assertSuccessful();
    }
}
