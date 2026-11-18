<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Api\Contracts\ApiResponse;
use App\Http\Controllers\Api\ApiBaseController;
use App\Http\Requests\Api\V1\Bookings\StoreBookingRequest;
use App\Http\Resources\V1\BookingResource;
use App\Models\Booking;
use App\Models\BookingDocument;
use App\Models\BookingNote;
use App\Models\Employee;
use App\Services\Bookings\BookingFilterService;
use App\Services\Bookings\BookingWorkflowException;
use App\Services\Bookings\BookingWorkflowService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class BookingController extends ApiBaseController
{
    private const LIST_RELATIONS = ['car.brand', 'employee'];

    private const DETAIL_RELATIONS = ['car.brand', 'employee', 'notes_list.employee', 'documents'];

    private const MAX_PER_PAGE = 100;

    private const OFFER_RULES = [
        'calculator_bank_id' => ['nullable', 'exists:calculator_banks,id'],
        'total_price' => ['nullable', 'numeric', 'min:0'],
        'purchase_price' => ['nullable', 'numeric', 'min:0'],
        'authorization_price' => ['nullable', 'numeric', 'min:0'],
        'expenses' => ['nullable', 'numeric', 'min:0'],
        'net_commission' => ['nullable', 'numeric'],
        'down_payment' => ['nullable', 'numeric', 'min:0'],
        'duration_years' => ['nullable', 'integer', 'min:1', 'max:10'],
        'monthly_installment' => ['nullable', 'numeric', 'min:0'],
        'balloon_payment' => ['nullable', 'numeric', 'min:0'],
        'offer_notes' => ['nullable', 'string', 'max:2000'],
        'delivery_note' => ['nullable', 'string', 'max:2000'],
    ];

    public function index(Request $request, BookingFilterService $filters): ApiResponse
    {
        Gate::authorize('viewAny', Booking::class);

        $request->validate([
            'group' => ['nullable', Rule::in(BookingFilterService::GROUPS)],
            'status' => ['nullable', Rule::in(array_keys(Booking::STATUSES))],
            'per_page' => ['nullable', 'integer', 'min:1'],
        ]);

        $perPage = min((int) $request->integer('per_page', 20), self::MAX_PER_PAGE);

        $query = Booking::query()->with(self::LIST_RELATIONS);
        $filters->apply($query, $request->query(), $request->user('employee'));

        $bookings = $query->paginate($perPage)->withQueryString();
        $bookings->setCollection(collect(BookingResource::collection($bookings->getCollection())->resolve()));

        return $this->respondPaginated($bookings, 'Bookings retrieved successfully');
    }

    public function store(StoreBookingRequest $request): ApiResponse
    {
        Gate::authorize('create', Booking::class);

        $data = $request->validated();

        $booking = Booking::create([
            ...$data,
            'total_price' => $data['total_price'] ?? 0,
            'down_payment' => $data['down_payment'] ?? 0,
            'duration_years' => $data['duration_years'] ?? 5,
            'monthly_installment' => $data['monthly_installment'] ?? 0,
            'source' => 'CRM (يدوي)',
            'status' => 'new',
            'assigned_to' => $request->user('employee')->id,
        ]);

        return $this->respondCreated($this->bookingData($booking), 'Booking created successfully');
    }

    public function show(Booking $booking): ApiResponse
    {
        Gate::authorize('view', $booking);

        return $this->respondSuccess($this->bookingData($booking));
    }

    public function updateOffer(Request $request, Booking $booking): ApiResponse
    {
        Gate::authorize('update', $booking);

        $booking->update($request->validate(self::OFFER_RULES));

        return $this->respondSuccess($this->bookingData($booking), 'Offer details updated successfully');
    }

    public function updateStatus(Request $request, Booking $booking, BookingWorkflowService $workflow): ApiResponse
    {
        Gate::authorize('update', $booking);

        $request->validate($workflow->targetStatusRules());
        $input = $request->validate($workflow->statusRules($request->string('status')->value()), $workflow->messages());

        return $this->runWorkflow($booking, fn () => $workflow->changeStatus($booking, $request->user('employee'), $request->string('status')->value(), $input));
    }

    public function approve(Booking $booking, BookingWorkflowService $workflow): ApiResponse
    {
        Gate::authorize('supervise', $booking);

        return $this->runWorkflow($booking, fn () => $workflow->approveClose($booking, request()->user('employee')));
    }

    public function reject(Request $request, Booking $booking, BookingWorkflowService $workflow): ApiResponse
    {
        Gate::authorize('supervise', $booking);

        $input = $request->validate($workflow->rejectRules(), $workflow->rejectMessages());

        return $this->runWorkflow($booking, fn () => $workflow->rejectClose($booking, $request->user('employee'), $input['status'], $input['note']));
    }

    public function assign(Request $request, Booking $booking, BookingWorkflowService $workflow): ApiResponse
    {
        Gate::authorize('supervise', $booking);

        $input = $request->validate([
            'employee_id' => ['required', Rule::exists('employees', 'id')->where('is_active', true)],
        ]);

        $message = $workflow->assign($booking, Employee::findOrFail($input['employee_id']));

        return $this->respondSuccess($this->bookingData($booking), $message);
    }

    public function addNote(Request $request, Booking $booking): ApiResponse
    {
        Gate::authorize('update', $booking);

        $input = $request->validate([
            'note' => ['required', 'string', 'max:2000'],
            'type' => ['nullable', Rule::in(['note', 'call'])],
        ]);

        BookingNote::create([
            'booking_id' => $booking->id,
            'employee_id' => $request->user('employee')->id,
            'note' => $input['note'],
            'type' => $input['type'] ?? 'note',
        ]);

        return $this->respondCreated($this->bookingData($booking), 'Note added successfully');
    }

    public function uploadDocument(Request $request, Booking $booking): ApiResponse
    {
        Gate::authorize('update', $booking);

        $request->validate([
            'file' => ['required', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png,webp,heic,doc,docx,xls,xlsx'],
            'title' => ['nullable', 'string', 'max:255'],
        ]);

        $file = $request->file('file');
        // Store in private storage disk
        $path = $file->store('booking_documents', 'local');

        $document = $booking->documents()->create([
            'employee_id' => $request->user('employee')?->id,
            'title' => $request->input('title') ?: $file->getClientOriginalName(),
            'file_path' => $path,
            'file_type' => $file->getClientOriginalExtension(),
        ]);

        return $this->respondCreated($document, 'Document uploaded successfully to secure storage');
    }

    public function downloadDocument(Booking $booking, BookingDocument $document): StreamedResponse
    {
        Gate::authorize('view', $booking);

        if ($document->booking_id !== $booking->id) {
            abort(404, 'Document does not belong to this booking');
        }

        // Check private local disk first, fallback to public disk for legacy documents
        $disk = 'local';
        if (! Storage::disk('local')->exists($document->file_path)) {
            if (Storage::disk('public')->exists($document->file_path)) {
                $disk = 'public';
            } else {
                abort(404, 'Document file not found on disk');
            }
        }

        return Storage::disk($disk)->download($document->file_path, $document->title);
    }

    public function deleteDocument(Booking $booking, BookingDocument $document): ApiResponse
    {
        Gate::authorize('update', $booking);

        if ($document->booking_id !== $booking->id) {
            abort(404, 'Document does not belong to this booking');
        }

        if ($document->file_path) {
            if (Storage::disk('local')->exists($document->file_path)) {
                Storage::disk('local')->delete($document->file_path);
            } elseif (Storage::disk('public')->exists($document->file_path)) {
                Storage::disk('public')->delete($document->file_path);
            }
        }

        $document->delete();

        return $this->respondDeleted('Document removed successfully');
    }

    public function destroy(Booking $booking): ApiResponse
    {
        Gate::authorize('delete', $booking);

        $booking->delete();

        return $this->respondDeleted('Booking deleted successfully');
    }

    /**
     * @param  callable(): string  $transition
     */
    private function runWorkflow(Booking $booking, callable $transition): ApiResponse
    {
        try {
            $message = $transition();
        } catch (BookingWorkflowException $e) {
            return $this->respondError($e->getMessage(), 422);
        }

        return $this->respondSuccess($this->bookingData($booking), $message);
    }

    /**
     * @return array<string, mixed>
     */
    private function bookingData(Booking $booking): array
    {
        $booking->refresh()->load(self::DETAIL_RELATIONS);

        return (new BookingResource($booking))->resolve();
    }
}
