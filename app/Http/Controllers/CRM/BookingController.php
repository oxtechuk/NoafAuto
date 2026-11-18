<?php

namespace App\Http\Controllers\CRM;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\BookingDocument;
use App\Models\BookingNote;
use App\Models\CalculatorBank;
use App\Models\Car;
use App\Models\Employee;
use App\Services\AttributionHelper;
use App\Services\Bookings\BookingWorkflowException;
use App\Services\Bookings\BookingWorkflowService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

class BookingController extends Controller
{
    private const DOCUMENT_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic', 'doc', 'docx', 'xls', 'xlsx'];

    private const OFFER_RULES = [
        'calculator_bank_id' => 'nullable|exists:calculator_banks,id',
        'total_price' => 'nullable|numeric|min:0',
        'purchase_price' => 'nullable|numeric|min:0',
        'authorization_price' => 'nullable|numeric|min:0',
        'expenses' => 'nullable|numeric|min:0',
        'net_commission' => 'nullable|numeric',
        'down_payment' => 'nullable|numeric|min:0',
        'duration_years' => 'nullable|integer|min:1|max:10',
        'monthly_installment' => 'nullable|numeric|min:0',
        'balloon_payment' => 'nullable|numeric|min:0',
        'offer_notes' => 'nullable|string|max:2000',
        'delivery_note' => 'nullable|string|max:2000',
    ];

    /**
     * Active bookings list (مسار المبيعات النشط)
     */
    public function index(Request $request)
    {
        $sort = $request->input('sort', 'newest');
        $isAdmin = auth('employee')->user()->isAdmin();

        // Active pipeline statuses (excludes pending, received, lost statuses)
        $activeStatuses = ['new', 'contacted_no_answer', 'recontact_client', 'waiting_documents', 'bank_review', 'approved', 'authorized'];

        // Base scoped query (per employee or filtered for admin)
        $scopedQuery = Booking::query()->whereIn('status', $activeStatuses);
        if (! $isAdmin) {
            $scopedQuery->where('assigned_to', auth()->id());
        } elseif ($request->filled('employee_id')) {
            $scopedQuery->where('assigned_to', $request->employee_id);
        }

        // Apply month/date filter to stats if provided
        if ($request->filled('month')) {
            $parts = explode('-', $request->month);
            if (count($parts) === 2) {
                $scopedQuery->whereYear('created_at', $parts[0])->whereMonth('created_at', $parts[1]);
            }
        } elseif ($request->filled('date')) {
            $scopedQuery->whereDate('created_at', $request->date);
        }

        // Ad Platform filter
        if ($request->filled('platform')) {
            AttributionHelper::applyPlatformFilter($scopedQuery, $request->platform);
        }

        $stats = [
            'total' => (clone $scopedQuery)->count(),
            'car_requests' => (clone $scopedQuery)->where(function ($q) {
                $q->where('source', '!=', 'calculator')->orWhereNull('source');
            })->count(),
            'calculator_leads' => (clone $scopedQuery)->where(function ($q) {
                $q->where('source', 'calculator')
                    ->orWhere(function ($sub) {
                        $sub->whereNull('source')->whereNotNull('calculator_bank_id');
                    });
            })->count(),
            'pending_review' => (clone $scopedQuery)->whereIn('status', ['new', 'contacted_no_answer', 'recontact_client'])->count(),
            'under_bank' => (clone $scopedQuery)->whereIn('status', ['waiting_documents', 'bank_review', 'approved', 'authorized'])->count(),
        ];

        // Pending supervisor approvals (admin only)
        $pendingApprovals = $isAdmin
            ? Booking::with(['car.brand', 'car.carModel', 'car.category', 'employee'])
                ->where('status', 'waiting_supervisor_approval')
                ->latest()
                ->get()
            : collect();

        $query = Booking::with(['car.brand', 'car.carModel', 'car.category', 'employee'])->whereIn('status', $activeStatuses);

        if (! $isAdmin) {
            $query->where('assigned_to', auth()->id());
        } elseif ($request->filled('employee_id')) {
            $query->where('assigned_to', $request->employee_id);
        }

        // Month / Date filter
        if ($request->filled('month')) {
            $parts = explode('-', $request->month);
            if (count($parts) === 2) {
                $query->whereYear('created_at', $parts[0])->whereMonth('created_at', $parts[1]);
            }
        } elseif ($request->filled('date')) {
            $query->whereDate('created_at', $request->date);
        }

        // Ad Platform filter
        if ($request->filled('platform')) {
            AttributionHelper::applyPlatformFilter($query, $request->platform);
        }

        // Source / Type filter - default to 'cars' (طلبات السيارات الفعلية)
        $currentSource = $request->input('source', 'cars');
        if (empty($currentSource)) {
            $currentSource = 'cars';
        }

        if ($currentSource === 'calculator') {
            $query->where(function ($q) {
                $q->where('source', 'calculator')
                    ->orWhere(function ($sub) {
                        $sub->whereNull('source')->whereNotNull('calculator_bank_id');
                    });
            });
        } elseif ($currentSource === 'cars' || $currentSource === 'booking') {
            $query->where(function ($q) {
                $q->where('source', '!=', 'calculator')
                    ->orWhereNull('source');
            });
        } elseif ($currentSource === 'all') {
            // All sources: both car requests and calculator leads together
        } elseif ($currentSource === 'test_drive') {
            $query->where('booking_type', 'test_drive');
        } elseif ($currentSource === 'purchase') {
            $query->where('booking_type', 'purchase');
        } elseif ($currentSource === 'crm_manual') {
            $query->where('source', 'like', '%CRM%');
        }

        // Status filter (within active statuses)
        if ($request->filled('status') && in_array($request->status, $activeStatuses)) {
            $query->where('status', $request->status);
        }

        // Search
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('client_name', 'like', "%$s%")
                    ->orWhere('client_phone', 'like', "%$s%");
            });
        }

        // Sort
        if ($sort === 'oldest') {
            $query->oldest();
        } else {
            $query->latest();
        }

        $bookings = $query->paginate(20)->withQueryString();

        $phones = $bookings->pluck('client_phone')->filter()->unique();
        $repeatedCounts = $phones->isNotEmpty()
            ? Booking::whereIn('client_phone', $phones)
                ->select('client_phone', DB::raw('count(*) as aggregate'))
                ->groupBy('client_phone')
                ->having('aggregate', '>', 1)
                ->pluck('aggregate', 'client_phone')
            : collect();

        $employees = Employee::where('is_active', true)->get();
        $statuses = collect(Booking::STATUSES)->only($activeStatuses)->toArray();
        $cars = Car::with('brand')->where('is_active', true)->get();

        return view('crm.bookings.index', compact(
            'bookings', 'employees', 'statuses', 'cars', 'stats', 'pendingApprovals', 'isAdmin', 'currentSource', 'repeatedCounts'
        ));
    }

    /**
     * Pending bookings list (طلبات قيد الانتظار)
     */
    public function pendingIndex(Request $request)
    {
        $sort = $request->input('sort', 'nearest_follow_up');
        $isAdmin = auth('employee')->user()->isAdmin();

        $scopedQuery = Booking::query()->where('status', 'pending');
        if (! $isAdmin) {
            $scopedQuery->where('assigned_to', auth()->id());
        } elseif ($request->filled('employee_id')) {
            $scopedQuery->where('assigned_to', $request->employee_id);
        }

        // Month filter
        if ($request->filled('month')) {
            $parts = explode('-', $request->month);
            if (count($parts) === 2) {
                $scopedQuery->whereYear('created_at', $parts[0])->whereMonth('created_at', $parts[1]);
            }
        } elseif ($request->filled('date')) {
            $scopedQuery->whereDate('created_at', $request->date);
        }

        $today = today();
        $now = now();

        $stats = [
            'total' => (clone $scopedQuery)->count(),
            'today' => (clone $scopedQuery)->whereDate('follow_up_at', $today)->count(),
            'overdue' => (clone $scopedQuery)->where('follow_up_at', '<', $now)->count(),
            'upcoming' => (clone $scopedQuery)->where('follow_up_at', '>', $now)->count(),
        ];

        $query = Booking::with(['car.brand', 'employee'])->where('status', 'pending');

        if (! $isAdmin) {
            $query->where('assigned_to', auth()->id());
        } elseif ($request->filled('employee_id')) {
            $query->where('assigned_to', $request->employee_id);
        }

        // Month / Date filter
        if ($request->filled('month')) {
            $parts = explode('-', $request->month);
            if (count($parts) === 2) {
                $query->whereYear('created_at', $parts[0])->whereMonth('created_at', $parts[1]);
            }
        } elseif ($request->filled('date')) {
            $query->whereDate('created_at', $request->date);
        }

        // Timing filter
        if ($request->filled('timing')) {
            if ($request->timing === 'today') {
                $query->whereDate('follow_up_at', $today);
            } elseif ($request->timing === 'overdue') {
                $query->where('follow_up_at', '<', $now);
            } elseif ($request->timing === 'upcoming') {
                $query->where('follow_up_at', '>', $now);
            }
        }

        // Source / Type filter
        if ($request->filled('source')) {
            if ($request->source === 'calculator') {
                $query->where(function ($q) {
                    $q->where('source', 'calculator')
                        ->orWhere(function ($sub) {
                            $sub->whereNull('source')->whereNotNull('calculator_bank_id');
                        });
                });
            } elseif ($request->source === 'cars' || $request->source === 'booking') {
                $query->where(function ($q) {
                    $q->where('source', '!=', 'calculator')
                        ->orWhereNull('source');
                });
            } elseif ($request->source === 'test_drive') {
                $query->where('booking_type', 'test_drive');
            } elseif ($request->source === 'purchase') {
                $query->where('booking_type', 'purchase');
            } elseif ($request->source === 'crm_manual') {
                $query->where('source', 'like', '%CRM%');
            }
        }

        // Search
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('client_name', 'like', "%$s%")
                    ->orWhere('client_phone', 'like', "%$s%");
            });
        }

        // Sort
        if ($sort === 'oldest') {
            $query->oldest('created_at');
        } elseif ($sort === 'newest') {
            $query->latest('created_at');
        } elseif ($sort === 'furthest_follow_up') {
            $query->orderByDesc('follow_up_at');
        } else {
            // nearest_follow_up (default)
            $query->orderBy('follow_up_at', 'asc');
        }

        $bookings = $query->paginate(20)->withQueryString();
        $employees = Employee::where('is_active', true)->get();
        $allStatuses = Booking::STATUSES;
        $cars = Car::with('brand')->where('is_active', true)->get();

        return view('crm.bookings.pending', compact(
            'bookings', 'employees', 'allStatuses', 'cars', 'stats', 'isAdmin'
        ));
    }

    /**
     * Delivered bookings list (طلبات تم التسليم / المستلمة)
     */
    public function deliveredIndex(Request $request)
    {
        $sort = $request->input('sort', 'newest');
        $isAdmin = auth('employee')->user()->isAdmin();

        $scopedQuery = Booking::query()->where('status', 'received');
        if (! $isAdmin) {
            $scopedQuery->where('assigned_to', auth()->id());
        } elseif ($request->filled('employee_id')) {
            $scopedQuery->where('assigned_to', $request->employee_id);
        }

        // Month filter
        if ($request->filled('month')) {
            $parts = explode('-', $request->month);
            if (count($parts) === 2) {
                $scopedQuery->where(function ($q) use ($parts) {
                    $q->where(function ($sub) use ($parts) {
                        $sub->whereNotNull('delivered_at')
                            ->whereYear('delivered_at', $parts[0])
                            ->whereMonth('delivered_at', $parts[1]);
                    })->orWhere(function ($sub) use ($parts) {
                        $sub->whereNull('delivered_at')
                            ->whereYear('updated_at', $parts[0])
                            ->whereMonth('updated_at', $parts[1]);
                    });
                });
            }
        } elseif ($request->filled('date')) {
            $scopedQuery->where(function ($q) use ($request) {
                $q->whereDate('delivered_at', $request->date)
                    ->orWhere(function ($sub) use ($request) {
                        $sub->whereNull('delivered_at')->whereDate('updated_at', $request->date);
                    });
            });
        }

        $now = now();
        $currentMonthDeliveredQuery = (clone $scopedQuery)->where(function ($q) use ($now) {
            $q->where(function ($sub) use ($now) {
                $sub->whereNotNull('delivered_at')
                    ->whereYear('delivered_at', $now->year)
                    ->whereMonth('delivered_at', $now->month);
            })->orWhere(function ($sub) use ($now) {
                $sub->whereNull('delivered_at')
                    ->whereYear('updated_at', $now->year)
                    ->whereMonth('updated_at', $now->month);
            });
        });

        $stats = [
            'total_delivered' => (clone $scopedQuery)->count(),
            'month_delivered' => (clone $currentMonthDeliveredQuery)->count(),
            'total_commission' => (clone $scopedQuery)->sum('net_commission'),
            'month_commission' => (clone $currentMonthDeliveredQuery)->sum('net_commission'),
            'total_sales_value' => (clone $scopedQuery)->sum('total_price'),
        ];

        $query = Booking::with(['car.brand', 'employee'])->where('status', 'received');

        if (! $isAdmin) {
            $query->where('assigned_to', auth()->id());
        } elseif ($request->filled('employee_id')) {
            $query->where('assigned_to', $request->employee_id);
        }

        // Month / Date filter
        if ($request->filled('month')) {
            $parts = explode('-', $request->month);
            if (count($parts) === 2) {
                $query->where(function ($q) use ($parts) {
                    $q->where(function ($sub) use ($parts) {
                        $sub->whereNotNull('delivered_at')
                            ->whereYear('delivered_at', $parts[0])
                            ->whereMonth('delivered_at', $parts[1]);
                    })->orWhere(function ($sub) use ($parts) {
                        $sub->whereNull('delivered_at')
                            ->whereYear('updated_at', $parts[0])
                            ->whereMonth('updated_at', $parts[1]);
                    });
                });
            }
        } elseif ($request->filled('date')) {
            $query->where(function ($q) use ($request) {
                $q->whereDate('delivered_at', $request->date)
                    ->orWhere(function ($sub) use ($request) {
                        $sub->whereNull('delivered_at')->whereDate('updated_at', $request->date);
                    });
            });
        }

        // Source / Type filter
        if ($request->filled('source')) {
            if ($request->source === 'calculator') {
                $query->where(function ($q) {
                    $q->where('source', 'calculator')
                        ->orWhere(function ($sub) {
                            $sub->whereNull('source')->whereNotNull('calculator_bank_id');
                        });
                });
            } elseif ($request->source === 'cars' || $request->source === 'booking') {
                $query->where(function ($q) {
                    $q->where('source', '!=', 'calculator')
                        ->orWhereNull('source');
                });
            } elseif ($request->source === 'test_drive') {
                $query->where('booking_type', 'test_drive');
            } elseif ($request->source === 'purchase') {
                $query->where('booking_type', 'purchase');
            } elseif ($request->source === 'crm_manual') {
                $query->where('source', 'like', '%CRM%');
            }
        }

        // Search
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('client_name', 'like', "%$s%")
                    ->orWhere('client_phone', 'like', "%$s%");
            });
        }

        // Sort
        if ($sort === 'oldest') {
            $query->orderBy(DB::raw('COALESCE(delivered_at, updated_at)'), 'asc');
        } elseif ($sort === 'highest_commission') {
            $query->orderByDesc('net_commission');
        } elseif ($sort === 'highest_price') {
            $query->orderByDesc('total_price');
        } else {
            $query->orderBy(DB::raw('COALESCE(delivered_at, updated_at)'), 'desc');
        }

        $bookings = $query->paginate(20)->withQueryString();
        $employees = Employee::where('is_active', true)->get();
        $allStatuses = Booking::STATUSES;
        $cars = Car::with('brand')->where('is_active', true)->get();

        return view('crm.bookings.delivered', compact(
            'bookings', 'employees', 'allStatuses', 'cars', 'stats', 'isAdmin'
        ));
    }

    /**
     * Closed bookings list (الحالات المغلقة / الخاسرة)
     */
    public function closedIndex(Request $request)
    {
        $sort = $request->input('sort', 'newest');
        $isAdmin = auth('employee')->user()->isAdmin();

        // Get all closed lost status keys from Booking::STATUSES (is_lost == true or group == 'lost')
        $closedStatuses = collect(Booking::STATUSES)
            ->filter(fn ($s) => ($s['is_lost'] ?? false) === true || ($s['group'] ?? '') === 'lost')
            ->keys()
            ->toArray();

        // Base scoped query (per employee or all for admin)
        $scopedQuery = Booking::query()->whereIn('status', $closedStatuses);
        if (! $isAdmin) {
            $scopedQuery->where('assigned_to', auth()->id());
        } elseif ($request->filled('employee_id')) {
            $scopedQuery->where('assigned_to', $request->employee_id);
        }

        // Month filter
        if ($request->filled('month')) {
            $parts = explode('-', $request->month);
            if (count($parts) === 2) {
                $scopedQuery->whereYear('updated_at', $parts[0])->whereMonth('updated_at', $parts[1]);
            }
        } elseif ($request->filled('date')) {
            $scopedQuery->whereDate('updated_at', $request->date);
        }

        // Calculate closed stats
        $totalClosed = (clone $scopedQuery)->count();
        $now = now();
        $closedThisMonth = (clone $scopedQuery)->whereYear('updated_at', $now->year)->whereMonth('updated_at', $now->month)->count();

        $statsByStatus = [];
        foreach ($closedStatuses as $statusKey) {
            $statusCount = (clone $scopedQuery)->where('status', $statusKey)->count();
            $percentage = $totalClosed > 0 ? round(($statusCount / $totalClosed) * 100) : 0;
            $statsByStatus[$statusKey] = [
                'count' => $statusCount,
                'percentage' => $percentage,
                'label' => Booking::STATUSES[$statusKey]['label'] ?? $statusKey,
                'color' => Booking::STATUSES[$statusKey]['color'] ?? 'secondary',
            ];
        }

        // Sort stats by count descending
        uasort($statsByStatus, fn ($a, $b) => $b['count'] <=> $a['count']);

        $query = Booking::with(['car.brand', 'employee'])->whereIn('status', $closedStatuses);

        if (! $isAdmin) {
            $query->where('assigned_to', auth()->id());
        } elseif ($request->filled('employee_id')) {
            $query->where('assigned_to', $request->employee_id);
        }

        // Month / Date filter
        if ($request->filled('month')) {
            $parts = explode('-', $request->month);
            if (count($parts) === 2) {
                $query->whereYear('updated_at', $parts[0])->whereMonth('updated_at', $parts[1]);
            }
        } elseif ($request->filled('date')) {
            $query->whereDate('updated_at', $request->date);
        }

        // Filtering by source / type
        if ($request->filled('source')) {
            if ($request->source === 'calculator') {
                $query->where(function ($q) {
                    $q->where('source', 'calculator')
                        ->orWhere(function ($sub) {
                            $sub->whereNull('source')->whereNotNull('calculator_bank_id');
                        });
                });
            } elseif ($request->source === 'cars' || $request->source === 'booking') {
                $query->where(function ($q) {
                    $q->where('source', '!=', 'calculator')
                        ->orWhereNull('source');
                });
            } elseif ($request->source === 'test_drive') {
                $query->where('booking_type', 'test_drive');
            } elseif ($request->source === 'purchase') {
                $query->where('booking_type', 'purchase');
            } elseif ($request->source === 'crm_manual') {
                $query->where('source', 'like', '%CRM%');
            }
        }

        // Filtering by status (only if it is a closed status)
        if ($request->filled('status') && in_array($request->status, $closedStatuses)) {
            $query->where('status', $request->status);
        }

        // Search
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('client_name', 'like', "%$s%")
                    ->orWhere('client_phone', 'like', "%$s%");
            });
        }

        // Sorting
        if ($sort === 'oldest') {
            $query->oldest('updated_at');
        } else {
            $query->latest('updated_at');
        }

        $bookings = $query->paginate(20)->withQueryString();
        $employees = Employee::where('is_active', true)->get();
        $statuses = collect(Booking::STATUSES)->only($closedStatuses)->toArray();
        $cars = Car::with('brand')->where('is_active', true)->get();

        return view('crm.bookings.closed', compact(
            'bookings', 'employees', 'statuses', 'cars', 'totalClosed', 'closedThisMonth', 'statsByStatus', 'isAdmin'
        ));
    }

    public function store(Request $request)
    {
        $request->validate([
            'client_name' => 'required|string|max:191',
            'client_phone' => 'required|string|max:191',
            'client_email' => 'nullable|email|max:191',
            'car_id' => 'nullable|exists:cars,id',
            'total_price' => 'nullable|numeric',
            'down_payment' => 'nullable|numeric',
            'duration_years' => 'nullable|integer',
            'monthly_installment' => 'nullable|numeric',
            'notes' => 'nullable|string',
            'type' => 'nullable|string',
            'booking_type' => 'nullable|string|in:test_drive,purchase,inquiry',
            'location' => 'nullable|string|max:500',
        ]);

        $booking = Booking::create([
            'client_name' => $request->client_name,
            'client_phone' => $request->client_phone,
            'client_email' => $request->client_email,
            'car_id' => $request->car_id,
            'total_price' => $request->total_price ?? 0,
            'down_payment' => $request->down_payment ?? 0,
            'duration_years' => $request->duration_years ?? 5,
            'monthly_installment' => $request->monthly_installment ?? 0,
            'notes' => $request->notes,
            'booking_type' => $request->booking_type,
            'location' => $request->location,
            'source' => 'CRM (يدوي)',
            'status' => 'new',
            'assigned_to' => auth('employee')->id(), // assign to the creator by default
        ]);

        return back()->with('success', 'تم إنشاء الطلب بنجاح');
    }

    public function show(Booking $booking)
    {
        Gate::authorize('view', $booking);

        $booking->load(['car.brand', 'employee', 'financingBank', 'notes_list.employee', 'documents.employee', 'tasks.assignedTo']);
        $employees = Employee::where('is_active', true)->get();
        $statuses = Booking::STATUSES;
        $calculatorBanks = CalculatorBank::activeOrdered()->get();

        return view('crm.bookings.show', compact('booking', 'employees', 'statuses', 'calculatorBanks'));
    }

    public function updateOffer(Request $request, Booking $booking)
    {
        Gate::authorize('update', $booking);

        $data = $request->validate(self::OFFER_RULES);

        $booking->update($data);

        return back()->with('success', 'تم تحديث تفاصيل العرض والبيانات المالية بنجاح');
    }

    public function updateStatus(Request $request, Booking $booking, BookingWorkflowService $workflow)
    {
        Gate::authorize('update', $booking);

        $request->validate($workflow->targetStatusRules());

        try {
            $workflow->ensureStatusCanChange($booking, auth('employee')->user());
        } catch (BookingWorkflowException $e) {
            return back()->with('error', $e->getMessage());
        }

        $input = $request->validate($workflow->statusRules($request->status), $workflow->messages());

        return $this->runWorkflow(fn () => $workflow->changeStatus($booking, auth('employee')->user(), $request->status, $input));
    }

    public function approveStatus(Booking $booking, BookingWorkflowService $workflow)
    {
        $this->authorizeSupervisor($booking, 'غير مصرح لك بزيارة هذه الصفحة');

        return $this->runWorkflow(fn () => $workflow->approveClose($booking, auth('employee')->user()));
    }

    public function rejectStatus(Request $request, Booking $booking, BookingWorkflowService $workflow)
    {
        $this->authorizeSupervisor($booking, 'غير مصرح لك بزيارة هذه الصفحة');

        if ($booking->status !== BookingWorkflowService::AWAITING_APPROVAL || empty($booking->proposed_status)) {
            return back()->with('error', 'الطلب ليس بانتظار اعتماد الإغلاق.');
        }

        $input = $request->validate($workflow->rejectRules(), $workflow->rejectMessages());

        return $this->runWorkflow(fn () => $workflow->rejectClose($booking, auth('employee')->user(), $input['status'], $input['note']));
    }

    public function assign(Request $request, Booking $booking, BookingWorkflowService $workflow)
    {
        $this->authorizeSupervisor($booking, __('غير مصرح لك بإعادة إسناد أو تحويل الطلب. الصلاحية مقتصرة على المشرف/المدير فقط.'));

        $request->validate(['employee_id' => 'required|exists:employees,id']);

        return back()->with('success', $workflow->assign($booking, Employee::findOrFail($request->employee_id)));
    }

    public function addNote(Request $request, Booking $booking)
    {
        Gate::authorize('update', $booking);

        $request->validate(['note' => 'required|string|max:2000', 'type' => 'in:note,call']);
        BookingNote::create([
            'booking_id' => $booking->id,
            'employee_id' => auth('employee')->id(),
            'note' => $request->note,
            'type' => $request->type ?? 'note',
        ]);

        return back()->with('success', 'تمت إضافة الملاحظة');
    }

    public function uploadDocument(Request $request, Booking $booking)
    {
        Gate::authorize('update', $booking);

        $request->validate([
            'title' => 'nullable|string|max:255',
            'file' => ['required', 'file', 'max:10240', 'mimes:'.implode(',', self::DOCUMENT_EXTENSIONS)],
        ]);

        $file = $request->file('file');
        $path = $file->store('booking_documents', 'public');

        $booking->documents()->create([
            'employee_id' => auth('employee')->id(),
            'title' => $request->title ?? $file->getClientOriginalName(),
            'file_path' => $path,
            'file_type' => $file->extension(),
        ]);

        return back()->with('success', 'تم رفع المستند بنجاح');
    }

    public function deleteDocument(BookingDocument $document)
    {
        Gate::authorize('update', $document->booking);

        if ($document->file_path && Storage::disk('public')->exists($document->file_path)) {
            Storage::disk('public')->delete($document->file_path);
        }
        $document->delete();

        return back()->with('success', 'تم حذف المستند بنجاح');
    }

    public function destroy(Booking $booking)
    {
        $this->authorizeSupervisor($booking, __('غير مصرح لك بحذف الطلبات. صلاحية الحذف مقتصرة على المشرف/المدير فقط.'));

        $booking->delete();

        return redirect()->route('crm.bookings.index')->with('success', 'تم حذف الطلب بنجاح');
    }

    /**
     * Keep the CRM's existing localized 403 messages for supervisor-only actions.
     */
    private function authorizeSupervisor(Booking $booking, string $message): void
    {
        if (Gate::denies('supervise', $booking)) {
            abort(403, $message);
        }
    }

    /**
     * @param  callable(): string  $transition
     */
    private function runWorkflow(callable $transition)
    {
        try {
            return back()->with('success', $transition());
        } catch (BookingWorkflowException $e) {
            return back()->with('error', $e->getMessage());
        }
    }
}
