<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Models\Booking;
use App\Models\BookingDocument;
use App\Models\Employee;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class SecurityAndStorageTest extends TestCase
{
    use RefreshDatabase;

    private Employee $admin;

    private Employee $salesRep;

    private Employee $otherRep;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');
        Storage::fake('public');

        Permission::firstOrCreate(['name' => 'manage-bookings', 'guard_name' => 'employee']);

        $this->admin = Employee::factory()->create(['is_active' => true]);
        $this->admin->givePermissionTo('manage-bookings');

        $this->salesRep = Employee::factory()->create(['is_active' => true]);
        $this->salesRep->givePermissionTo('manage-bookings');

        $this->otherRep = Employee::factory()->create(['is_active' => true]);
        $this->otherRep->givePermissionTo('manage-bookings');
    }

    public function test_security_headers_are_attached_to_api_responses(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response->assertStatus(200)
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'SAMEORIGIN')
            ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
            ->assertHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    }

    public function test_version_endpoint_returns_system_version(): void
    {
        $response = $this->getJson('/api/v1/version');

        $response->assertStatus(200)
            ->assertJsonPath('data.version', config('sitekit.version'))
            ->assertJsonPath('data.channel', config('sitekit.update_channel'));
    }

    public function test_employee_can_upload_document_to_private_storage(): void
    {
        $booking = Booking::factory()->create(['assigned_to' => $this->salesRep->id]);
        $file = UploadedFile::fake()->create('national_id.pdf', 500, 'application/pdf');

        $response = $this->actingAs($this->salesRep, 'employee')
            ->postJson("/api/v1/bookings/{$booking->id}/documents", [
                'file' => $file,
                'title' => 'بطاقة الهوية الوطنية',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.title', 'بطاقة الهوية الوطنية')
            ->assertJsonPath('data.file_type', 'pdf');

        $document = BookingDocument::where('booking_id', $booking->id)->first();
        $this->assertNotNull($document);

        // Verify stored in private local disk, NOT in public
        Storage::disk('local')->assertExists($document->file_path);
        Storage::disk('public')->assertMissing($document->file_path);
    }

    public function test_assigned_employee_can_download_private_document(): void
    {
        $booking = Booking::factory()->create(['assigned_to' => $this->salesRep->id]);
        $filePath = 'booking_documents/test_id.pdf';
        Storage::disk('local')->put($filePath, 'PDF-CONTENT-BINARY');

        $document = BookingDocument::create([
            'booking_id' => $booking->id,
            'employee_id' => $this->salesRep->id,
            'title' => 'Customer ID',
            'file_path' => $filePath,
            'file_type' => 'pdf',
        ]);

        $response = $this->actingAs($this->salesRep, 'employee')
            ->get("/api/v1/bookings/{$booking->id}/documents/{$document->id}/download");

        $response->assertStatus(200);
        $this->assertStringContainsString('PDF-CONTENT-BINARY', $response->streamedContent());
    }

    public function test_unauthorized_employee_cannot_download_other_reps_document(): void
    {
        $booking = Booking::factory()->create(['assigned_to' => $this->salesRep->id]);
        $filePath = 'booking_documents/confidential.pdf';
        Storage::disk('local')->put($filePath, 'CONFIDENTIAL-DATA');

        $document = BookingDocument::create([
            'booking_id' => $booking->id,
            'employee_id' => $this->salesRep->id,
            'title' => 'Confidential',
            'file_path' => $filePath,
            'file_type' => 'pdf',
        ]);

        // otherRep is not assigned to this booking
        $response = $this->actingAs($this->otherRep, 'employee')
            ->get("/api/v1/bookings/{$booking->id}/documents/{$document->id}/download");

        $response->assertStatus(403);
    }

    public function test_assigned_employee_can_delete_document(): void
    {
        $booking = Booking::factory()->create(['assigned_to' => $this->salesRep->id]);
        $filePath = 'booking_documents/remove_me.pdf';
        Storage::disk('local')->put($filePath, 'REMOVE-ME');

        $document = BookingDocument::create([
            'booking_id' => $booking->id,
            'employee_id' => $this->salesRep->id,
            'title' => 'To Delete',
            'file_path' => $filePath,
            'file_type' => 'pdf',
        ]);

        $response = $this->actingAs($this->salesRep, 'employee')
            ->deleteJson("/api/v1/bookings/{$booking->id}/documents/{$document->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('booking_documents', ['id' => $document->id]);
        Storage::disk('local')->assertMissing($filePath);
    }
}
