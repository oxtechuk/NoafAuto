<?php

namespace Tests\Feature\Api\V1;

use App\Models\Booking;
use App\Models\Car;
use App\Models\Employee;
use App\Notifications\NewBookingNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class BookingApiTest extends TestCase
{
    use RefreshDatabase;

    private Employee $admin;

    private Employee $sales;

    private Employee $otherSales;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        Permission::findOrCreate('manage-bookings', 'employee');

        $this->admin = Employee::factory()->admin()->create();
        $this->sales = Employee::factory()->create();
        $this->sales->givePermissionTo('manage-bookings');
        $this->otherSales = Employee::factory()->create();
        $this->otherSales->givePermissionTo('manage-bookings');
    }

    public function test_guest_cannot_list_bookings(): void
    {
        $this->getJson(route('api.v1.bookings.index'))->assertUnauthorized();
    }

    public function test_employee_without_permission_is_forbidden(): void
    {
        $this->actingAs(Employee::factory()->create(), 'employee')
            ->getJson(route('api.v1.bookings.index'))
            ->assertForbidden();
    }

    public function test_sales_employee_only_lists_own_bookings(): void
    {
        $own = Booking::factory()->assignedTo($this->sales)->create();
        Booking::factory()->assignedTo($this->otherSales)->create();

        $this->actingAs($this->sales, 'employee')
            ->getJson(route('api.v1.bookings.index'))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $own->id);
    }

    public function test_bookings_can_be_filtered_by_group(): void
    {
        Booking::factory()->status('new')->create();
        $pending = Booking::factory()->status('pending')->create();
        Booking::factory()->status('lost_no_answer')->create();

        $this->actingAs($this->admin, 'employee')
            ->getJson(route('api.v1.bookings.index', ['group' => 'pending']))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $pending->id);

        $this->actingAs($this->admin, 'employee')
            ->getJson(route('api.v1.bookings.index', ['group' => 'closed']))
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_invalid_group_filter_is_rejected(): void
    {
        $this->actingAs($this->admin, 'employee')
            ->getJson(route('api.v1.bookings.index', ['group' => 'everything']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('group');
    }

    public function test_sales_employee_cannot_view_another_employees_booking(): void
    {
        $booking = Booking::factory()->assignedTo($this->otherSales)->create();

        $this->actingAs($this->sales, 'employee')
            ->getJson(route('api.v1.bookings.show', $booking))
            ->assertForbidden();
    }

    public function test_show_includes_history_and_documents(): void
    {
        $booking = Booking::factory()->assignedTo($this->sales)->create();

        $this->actingAs($this->sales, 'employee')
            ->getJson(route('api.v1.bookings.show', $booking))
            ->assertOk()
            ->assertJsonPath('data.id', $booking->id)
            ->assertJsonStructure(['data' => ['history', 'documents', 'financials', 'car', 'assigned_to']]);
    }

    public function test_missing_booking_returns_404(): void
    {
        $this->actingAs($this->admin, 'employee')
            ->getJson(route('api.v1.bookings.show', 999999))
            ->assertNotFound();
    }

    public function test_employee_can_create_booking_assigned_to_themselves(): void
    {
        $car = Car::factory()->create();

        $this->actingAs($this->sales, 'employee')
            ->postJson(route('api.v1.bookings.store'), [
                'client_name' => 'Fahad',
                'client_phone' => '0551234567',
                'car_id' => $car->id,
                'booking_type' => 'purchase',
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'new')
            ->assertJsonPath('data.assigned_to.id', $this->sales->id);
    }

    public function test_creating_booking_validates_input(): void
    {
        $this->actingAs($this->sales, 'employee')
            ->postJson(route('api.v1.bookings.store'), ['booking_type' => 'spaceship'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['client_name', 'client_phone', 'car_id', 'booking_type']);
    }

    public function test_status_change_to_pending_requires_follow_up_details(): void
    {
        $booking = Booking::factory()->assignedTo($this->sales)->create();

        $this->actingAs($this->sales, 'employee')
            ->patchJson(route('api.v1.bookings.status', $booking), ['status' => 'pending'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['pending_reason', 'follow_up_at', 'note']);
    }

    public function test_sales_employee_can_move_booking_forward(): void
    {
        $booking = Booking::factory()->assignedTo($this->sales)->create();

        $this->actingAs($this->sales, 'employee')
            ->patchJson(route('api.v1.bookings.status', $booking), ['status' => 'bank_review'])
            ->assertOk()
            ->assertJsonPath('data.status', 'bank_review')
            ->assertJsonPath('data.history.0.new_status', 'bank_review');
    }

    public function test_awaiting_approval_cannot_be_selected_manually(): void
    {
        $booking = Booking::factory()->assignedTo($this->sales)->create();

        $this->actingAs($this->sales, 'employee')
            ->patchJson(route('api.v1.bookings.status', $booking), ['status' => 'waiting_supervisor_approval'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');
    }

    public function test_sales_close_request_goes_to_supervisor_then_is_approved(): void
    {
        $booking = Booking::factory()->assignedTo($this->sales)->create();

        $this->actingAs($this->sales, 'employee')
            ->patchJson(route('api.v1.bookings.status', $booking), ['status' => 'lost_no_answer', 'note' => 'No reply'])
            ->assertOk()
            ->assertJsonPath('data.status', 'waiting_supervisor_approval')
            ->assertJsonPath('data.proposed_status', 'lost_no_answer');

        $this->actingAs($this->sales, 'employee')
            ->patchJson(route('api.v1.bookings.status', $booking), ['status' => 'bank_review'])
            ->assertUnprocessable();

        $this->actingAs($this->sales, 'employee')
            ->postJson(route('api.v1.bookings.approve', $booking))
            ->assertForbidden();

        $this->actingAs($this->admin, 'employee')
            ->postJson(route('api.v1.bookings.approve', $booking))
            ->assertOk()
            ->assertJsonPath('data.status', 'lost_no_answer');

        Notification::assertSentTo($this->sales, NewBookingNotification::class);
    }

    public function test_supervisor_can_reject_close_request(): void
    {
        $booking = Booking::factory()->assignedTo($this->sales)->awaitingApproval()->create();

        $this->actingAs($this->admin, 'employee')
            ->postJson(route('api.v1.bookings.reject', $booking), ['status' => 'recontact_client', 'note' => 'Try again'])
            ->assertOk()
            ->assertJsonPath('data.status', 'recontact_client')
            ->assertJsonPath('data.proposed_status', null);
    }

    public function test_approving_a_booking_that_is_not_awaiting_approval_fails(): void
    {
        $booking = Booking::factory()->assignedTo($this->sales)->create();

        $this->actingAs($this->admin, 'employee')
            ->postJson(route('api.v1.bookings.approve', $booking))
            ->assertUnprocessable()
            ->assertJsonPath('success', false);
    }

    public function test_only_supervisor_can_reassign(): void
    {
        $booking = Booking::factory()->assignedTo($this->sales)->create();

        $this->actingAs($this->sales, 'employee')
            ->patchJson(route('api.v1.bookings.assign', $booking), ['employee_id' => $this->otherSales->id])
            ->assertForbidden();

        $this->actingAs($this->admin, 'employee')
            ->patchJson(route('api.v1.bookings.assign', $booking), ['employee_id' => $this->otherSales->id])
            ->assertOk()
            ->assertJsonPath('data.assigned_to.id', $this->otherSales->id);
    }

    public function test_cannot_assign_to_inactive_employee(): void
    {
        $booking = Booking::factory()->create();
        $inactive = Employee::factory()->inactive()->create();

        $this->actingAs($this->admin, 'employee')
            ->patchJson(route('api.v1.bookings.assign', $booking), ['employee_id' => $inactive->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('employee_id');
    }

    public function test_employee_can_update_offer_and_add_notes_on_own_booking(): void
    {
        $booking = Booking::factory()->assignedTo($this->sales)->create();

        $this->actingAs($this->sales, 'employee')
            ->patchJson(route('api.v1.bookings.offer', $booking), ['net_commission' => 4500, 'offer_notes' => 'Good deal'])
            ->assertOk()
            ->assertJsonPath('data.financials.net_commission', '4500.00')
            ->assertJsonPath('data.offer_notes', 'Good deal');

        $this->actingAs($this->sales, 'employee')
            ->postJson(route('api.v1.bookings.notes.store', $booking), ['note' => 'Called client', 'type' => 'call'])
            ->assertCreated()
            ->assertJsonPath('data.history.0.type', 'call');
    }

    public function test_sales_employee_cannot_change_another_employees_booking(): void
    {
        $booking = Booking::factory()->assignedTo($this->otherSales)->create();

        $this->actingAs($this->sales, 'employee')
            ->patchJson(route('api.v1.bookings.status', $booking), ['status' => 'bank_review'])
            ->assertForbidden();

        $this->assertSame('new', $booking->fresh()->status);
    }

    public function test_only_supervisor_can_delete_booking(): void
    {
        $booking = Booking::factory()->assignedTo($this->sales)->create();

        $this->actingAs($this->sales, 'employee')
            ->deleteJson(route('api.v1.bookings.destroy', $booking))
            ->assertForbidden();

        $this->actingAs($this->admin, 'employee')
            ->deleteJson(route('api.v1.bookings.destroy', $booking))
            ->assertOk();

        $this->assertModelMissing($booking);
    }

    public function test_crm_sales_employee_cannot_open_or_change_another_employees_booking(): void
    {
        $booking = Booking::factory()->assignedTo($this->otherSales)->create();

        $this->actingAs($this->sales, 'employee')
            ->get(route('crm.bookings.show', $booking))
            ->assertForbidden();

        $this->actingAs($this->sales, 'employee')
            ->patch(route('crm.bookings.status', $booking), ['status' => 'bank_review'])
            ->assertForbidden();

        $this->actingAs($this->sales, 'employee')
            ->post(route('crm.bookings.note', $booking), ['note' => 'sneaky'])
            ->assertForbidden();
    }

    public function test_crm_document_upload_rejects_executable_files(): void
    {
        Storage::fake('public');
        $booking = Booking::factory()->assignedTo($this->sales)->create();

        $this->actingAs($this->sales, 'employee')
            ->post(route('crm.bookings.documents.store', $booking), [
                'file' => UploadedFile::fake()->createWithContent('shell.php', '<?php echo "pwned";'),
            ])
            ->assertSessionHasErrors('file');

        $this->assertSame(0, $booking->documents()->count());
    }

    public function test_crm_document_upload_accepts_pdf(): void
    {
        Storage::fake('public');
        $booking = Booking::factory()->assignedTo($this->sales)->create();

        $this->actingAs($this->sales, 'employee')
            ->post(route('crm.bookings.documents.store', $booking), [
                'file' => UploadedFile::fake()->create('salary.pdf', 120, 'application/pdf'),
            ])
            ->assertSessionHasNoErrors();

        $this->assertSame(1, $booking->documents()->count());
    }
}
