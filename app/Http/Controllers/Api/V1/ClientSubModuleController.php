<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Api\Contracts\ApiResponse;
use App\Http\Controllers\Api\ApiBaseController;
use App\Models\Booking;
use App\Models\CalculatorLead;
use App\Models\ContactSource;
use App\Models\GeneralSetting;
use App\Models\NewsletterSubscriber;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ClientSubModuleController extends ApiBaseController
{
    // ==========================================
    // CALCULATOR LEADS
    // ==========================================
    public function calculatorLeadsIndex(Request $request): ApiResponse
    {
        $query = CalculatorLead::query()->with(['car.brand', 'booking']);

        if ($request->filled('search')) {
            $s = trim((string) $request->input('search'));
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                    ->orWhere('phone', 'like', "%{$s}%");
            });
        }

        $leads = $query->latest()->paginate(20);

        return $this->respondPaginated($leads, 'Calculator leads retrieved');
    }

    public function calculatorLeadsDestroy(CalculatorLead $lead): ApiResponse
    {
        $lead->delete();

        return $this->respondSuccess(null, 'Calculator lead deleted');
    }

    // ==========================================
    // CONTACT SOURCES
    // ==========================================
    public function contactSourcesIndex(Request $request): ApiResponse
    {
        $query = ContactSource::query()->withCount('leads');
        if ($request->filled('search')) {
            $s = trim((string) $request->input('search'));
            $query->where('name', 'like', "%{$s}%");
        }
        $sources = $query->orderBy('sort_order')->latest()->paginate(20);

        return $this->respondPaginated($sources, 'Contact sources retrieved');
    }

    public function contactSourcesStore(Request $request): ApiResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'sort_order' => 'nullable|integer',
            'is_active' => 'boolean',
        ]);
        $data['is_active'] = $request->boolean('is_active', true);
        $data['sort_order'] = (int) ($data['sort_order'] ?? 0);
        $source = ContactSource::create($data);

        return $this->respondCreated($source, 'Contact source created');
    }

    public function contactSourcesUpdate(Request $request, ContactSource $source): ApiResponse
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:100',
            'sort_order' => 'nullable|integer',
            'is_active' => 'boolean',
        ]);
        if ($request->has('is_active')) {
            $data['is_active'] = $request->boolean('is_active');
        }
        if (array_key_exists('sort_order', $data)) {
            $data['sort_order'] = (int) ($data['sort_order'] ?? 0);
        }
        $source->update($data);

        return $this->respondSuccess($source, 'Contact source updated');
    }

    public function contactSourcesDestroy(ContactSource $source): ApiResponse
    {
        $source->delete();

        return $this->respondSuccess(null, 'Contact source deleted');
    }

    // ==========================================
    // NEWSLETTER SUBSCRIBERS
    // ==========================================
    public function newsletterIndex(Request $request): ApiResponse
    {
        $query = NewsletterSubscriber::query();
        if ($request->filled('search')) {
            $s = trim((string) $request->input('search'));
            $query->where('email', 'like', "%{$s}%");
        }
        $subscribers = $query->latest()->paginate(20);

        return $this->respondPaginated($subscribers, 'Newsletter subscribers retrieved');
    }

    public function newsletterDestroy(NewsletterSubscriber $subscriber): ApiResponse
    {
        $subscriber->delete();

        return $this->respondSuccess(null, 'Newsletter subscriber deleted');
    }

    // ==========================================
    // KANBAN TRACKING
    // ==========================================
    public function trackingIndex(): ApiResponse
    {
        $stages = [];
        foreach (Booking::STATUSES as $key => $meta) {
            $stages[$key] = [
                'key' => $key,
                'title' => $meta['label'],
                'color' => $meta['color'] ?? 'secondary',
                'group' => $meta['group'] ?? 'active',
                'total_amount' => 0,
                'items' => [],
            ];
        }

        $bookings = Booking::with(['car.brand', 'assignedEmployee'])
            ->whereIn('status', array_keys(Booking::STATUSES))
            ->latest()
            ->take(300)
            ->get();

        foreach ($bookings as $b) {
            $status = isset($stages[$b->status]) ? $b->status : 'new';
            $price = (float) ($b->total_price ?? 0);
            $stages[$status]['total_amount'] += $price;
            $stages[$status]['items'][] = [
                'id' => $b->id,
                'client_name' => $b->client_name,
                'client_phone' => $b->client_phone,
                'car_name' => $b->car?->name,
                'car_brand' => $b->car?->brand?->name,
                'car_year' => $b->car?->year,
                'total_price' => $b->total_price,
                'assigned_to' => $b->assignedEmployee?->name,
                'status' => $status,
                'created_at' => $b->created_at?->toIso8601String(),
                'updated_at' => $b->updated_at?->toIso8601String(),
            ];
        }

        return $this->respondSuccess($stages, 'Tracking stages retrieved');
    }

    public function trackingUpdateStage(Request $request, Booking $booking): ApiResponse
    {
        $data = $request->validate([
            'stage' => ['required', 'string', Rule::in(array_keys(Booking::STATUSES))],
        ]);
        $booking->update(['status' => $data['stage']]);

        return $this->respondSuccess($booking, 'Booking status updated');
    }

    // ==========================================
    // CALCULATOR SETTINGS
    // ==========================================
    public function calculatorSettingsShow(): ApiResponse
    {
        $settings = GeneralSetting::where('group', 'calculator')->pluck('value', 'key');

        return $this->respondSuccess($settings, 'Calculator settings retrieved');
    }

    public function calculatorSettingsUpdate(Request $request): ApiResponse
    {
        $data = $request->validate([
            'profit_rate' => 'nullable|numeric',
            'max_years' => 'nullable|integer',
            'min_down_payment' => 'nullable|numeric',
            'last_payment_max' => 'nullable|numeric',
            'insurance_rate' => 'nullable|numeric',
        ]);

        foreach ($data as $key => $val) {
            GeneralSetting::updateOrCreate(
                ['key' => $key, 'group' => 'calculator'],
                ['value' => (string) $val]
            );
        }

        return $this->respondSuccess($data, 'Calculator settings updated');
    }
}
