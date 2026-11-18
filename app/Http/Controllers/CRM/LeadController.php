<?php

namespace App\Http\Controllers\CRM;

use App\Http\Controllers\Controller;
use App\Jobs\SendWhatsAppCampaignMessage;
use App\Models\Booking;
use App\Models\Car;
use App\Models\ContactSource;
use App\Models\Employee;
use App\Models\Lead;
use App\Services\Leads\LeadFilterService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class LeadController extends Controller
{
    public const ACTIVE_BOOKING_STATUSES = LeadFilterService::ACTIVE_BOOKING_STATUSES;

    public const RECEIVED_BOOKING_STATUSES = LeadFilterService::RECEIVED_BOOKING_STATUSES;

    public const CLOSED_BOOKING_STATUSES = LeadFilterService::CLOSED_BOOKING_STATUSES;

    public function __construct(
        private readonly LeadFilterService $leadFilters,
    ) {}

    public function index(Request $request)
    {
        $isAdmin = auth('employee')->user()->isAdmin();
        $activeStatuses = ['new', 'contacted_no_answer', 'recontact_client', 'waiting_documents', 'bank_review', 'approved', 'authorized'];

        $query = Lead::with(['contactSource', 'car.brand', 'employee', 'orders.car.brand'])
            ->withCount('orders');

        $this->leadFilters->apply($query, $request->all(), auth('employee')->user());

        $leads = $query->paginate(20)->withQueryString();
        $statuses = collect(Booking::STATUSES)->only($activeStatuses)->toArray();
        $activeBookingStatuses = collect(Booking::STATUSES)->filter(fn ($s, $k) => in_array($k, self::ACTIVE_BOOKING_STATUSES))->toArray();
        $receivedBookingStatuses = collect(Booking::STATUSES)->filter(fn ($s, $k) => in_array($k, self::RECEIVED_BOOKING_STATUSES))->toArray();
        $closedBookingStatuses = collect(Booking::STATUSES)->filter(fn ($s, $k) => in_array($k, self::CLOSED_BOOKING_STATUSES) || str_starts_with($k, 'lost_'))->toArray();
        $leadStatuses = Lead::STATUSES;
        $bookingStatuses = Booking::STATUSES;
        $sources = ContactSource::activeOrdered()->get();
        $employees = Employee::where('is_active', true)->orderBy('name')->get();

        // Calculate dynamic stats for Booking Status Groups & Total
        $totalLeadsAllCount = Lead::count();
        $activeOrdersLeadsCount = Lead::whereHas('orders', fn ($q) => $q->whereIn('status', self::ACTIVE_BOOKING_STATUSES))->count();
        $receivedOrdersLeadsCount = Lead::whereHas('orders', fn ($q) => $q->whereIn('status', self::RECEIVED_BOOKING_STATUSES))->count();
        $closedOrdersLeadsCount = Lead::whereHas('orders', fn ($q) => $q->whereIn('status', self::CLOSED_BOOKING_STATUSES)->orWhere('status', 'like', 'lost_%'))->count();
        $noOrdersLeadsCount = Lead::whereDoesntHave('orders')->count();

        // Lead Statuses stats
        $activeLeadsCount = Lead::whereIn('status', ['new', 'contacted', 'interested', 'negotiation'])->count();
        $newLeadsCount = Lead::where('status', 'new')->count();
        $activeLeadsRatio = $totalLeadsAllCount > 0 ? round(($activeLeadsCount / $totalLeadsAllCount) * 100) : 0;
        $newLeadsRatio = $totalLeadsAllCount > 0 ? round(($newLeadsCount / $totalLeadsAllCount) * 100) : 0;

        return view('crm.leads.index', compact(
            'leads',
            'statuses',
            'activeBookingStatuses',
            'receivedBookingStatuses',
            'closedBookingStatuses',
            'leadStatuses',
            'bookingStatuses',
            'sources',
            'employees',
            'isAdmin',
            'totalLeadsAllCount',
            'activeOrdersLeadsCount',
            'receivedOrdersLeadsCount',
            'closedOrdersLeadsCount',
            'noOrdersLeadsCount',
            'activeLeadsCount',
            'newLeadsCount',
            'activeLeadsRatio',
            'newLeadsRatio'
        ));
    }

    public function create()
    {
        $statuses = Lead::STATUSES;
        $sources = ContactSource::activeOrdered()->get();
        $cars = Car::with('brand')->where('is_active', true)->orderByDesc('id')->get();
        $employees = Employee::where('is_active', true)->orderBy('name')->get();

        return view('crm.leads.create', compact('statuses', 'sources', 'cars', 'employees'));
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        Lead::create($data);

        return redirect()->route('crm.leads.index')->with('success', __('تم إضافة العميل بنجاح'));
    }

    public function show(Lead $lead)
    {
        Gate::authorize('view', $lead);

        $lead->load(['contactSource', 'car.brand', 'employee', 'orders.car.brand']);

        return view('crm.leads.show', compact('lead'));
    }

    public function edit(Lead $lead)
    {
        Gate::authorize('update', $lead);

        $statuses = Lead::STATUSES;
        $sources = ContactSource::activeOrdered()->get();
        $cars = Car::with('brand')->where('is_active', true)->orderByDesc('id')->get();
        $employees = Employee::where('is_active', true)->orderBy('name')->get();

        return view('crm.leads.edit', compact('lead', 'statuses', 'sources', 'cars', 'employees'));
    }

    public function update(Request $request, Lead $lead)
    {
        Gate::authorize('update', $lead);

        $data = $this->validated($request);
        $lead->update($data);

        return redirect()->route('crm.leads.show', $lead)->with('success', __('تم تحديث بيانات العميل'));
    }

    public function destroy(Lead $lead)
    {
        if (! auth('employee')->user()->isAdmin()) {
            abort(403, __('غير مصرح لك بحذف سجلات العملاء. صلاحية الحذف مقتصرة على المشرف/المدير فقط.'));
        }

        $lead->delete();

        return redirect()->route('crm.leads.index')->with('success', __('تم حذف السجل'));
    }

    public function whatsappCampaign(Request $request)
    {
        $request->validate([
            'message' => 'required|string|max:2000',
        ]);

        if ($request->boolean('target_all_filtered')) {
            $query = Lead::query();
            $this->leadFilters->apply($query, $request->all(), auth('employee')->user());
            $leads = $query->whereNotNull('client_phone')->where('client_phone', '!=', '')->get();
        } else {
            $request->validate([
                'lead_ids' => 'required|array|min:1',
                'lead_ids.*' => 'integer|exists:leads,id',
            ]);

            $leads = Lead::whereIn('id', $request->lead_ids)
                ->when(! auth('employee')->user()->isAdmin(), fn ($query) => $query->where('assigned_to', auth('employee')->id()))
                ->whereNotNull('client_phone')
                ->where('client_phone', '!=', '')
                ->get();
        }

        if ($leads->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => __('لا يوجد عملاء بأرقام هواتف صالحة للإرسال'),
            ], 422);
        }

        $delay = 0;
        foreach ($leads as $lead) {
            SendWhatsAppCampaignMessage::dispatch($lead->id, $request->message)
                ->delay(now()->addSeconds($delay));
            $delay += 1;
        }

        return response()->json([
            'success' => true,
            'total' => $leads->count(),
            'message' => __('تم جدولة إرسال :count رسالة واتساب بنجاح', ['count' => $leads->count()]),
        ]);
    }

    private function validated(Request $request): array
    {
        $statuses = array_keys(Lead::STATUSES);

        $data = $request->validate([
            'client_name' => 'required|string|max:200',
            'client_phone' => 'nullable|string|max:40',
            'client_email' => 'nullable|email|max:200',
            'contact_source_id' => 'required|exists:contact_sources,id',
            'status' => ['required', Rule::in($statuses)],
            'started_at' => 'required|date',
            'status_details' => 'nullable|string|max:5000',
            'car_id' => 'nullable|exists:cars,id',
            'assigned_to' => 'nullable|exists:employees,id',
        ]);

        return $data;
    }
}
