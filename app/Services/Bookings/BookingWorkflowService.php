<?php

namespace App\Services\Bookings;

use App\Models\Booking;
use App\Models\BookingNote;
use App\Models\Employee;
use App\Notifications\NewBookingNotification;
use App\Services\Cache\BaseCacheService;
use App\Services\TwilioWhatsAppService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Status transitions for bookings, shared by the CRM and the API.
 */
class BookingWorkflowService
{
    public const AWAITING_APPROVAL = 'waiting_supervisor_approval';

    public function __construct(
        private readonly BaseCacheService $cache,
    ) {}

    /**
     * Statuses an employee may pick by hand (approval is a system-managed state).
     *
     * @return array<int, string>
     */
    public function selectableStatuses(): array
    {
        return array_values(array_diff(array_keys(Booking::STATUSES), [self::AWAITING_APPROVAL]));
    }

    /**
     * Active statuses a supervisor may send a rejected close request back to.
     *
     * @return array<int, string>
     */
    public function reopenStatuses(): array
    {
        return array_keys(array_filter(
            Booking::STATUSES,
            fn (array $status): bool => $status['group'] === 'active' && ($status['is_close'] ?? false) === false,
        ));
    }

    /**
     * Validation rules for the extra fields a target status requires.
     *
     * @return array<string, array<int, mixed>>
     */
    public function statusRules(?string $targetStatus): array
    {
        return match ($targetStatus) {
            'received' => [
                'purchase_price' => ['nullable', 'numeric', 'min:0'],
                'authorization_price' => ['nullable', 'numeric', 'min:0'],
                'expenses' => ['nullable', 'numeric', 'min:0'],
                'net_commission' => ['nullable', 'numeric'],
                'down_payment' => ['nullable', 'numeric', 'min:0'],
                'monthly_installment' => ['nullable', 'numeric', 'min:0'],
                'note' => ['nullable', 'string', 'max:2000'],
            ],
            'pending' => [
                'pending_reason' => ['required', 'string', 'max:500'],
                'follow_up_at' => ['required', 'date', 'after:now'],
                'note' => ['required', 'string', 'max:2000'],
            ],
            default => [
                'note' => ['nullable', 'string', 'max:2000'],
            ],
        };
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function targetStatusRules(): array
    {
        return ['status' => ['required', Rule::in($this->selectableStatuses())]];
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rejectRules(): array
    {
        return [
            'status' => ['required', Rule::in($this->reopenStatuses())],
            'note' => ['required', 'string', 'max:2000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'pending_reason.required' => 'يرجى إدخال سبب الانتظار.',
            'follow_up_at.required' => 'يرجى تحديد وقت وتاريخ إعادة المتابعة.',
            'follow_up_at.after' => 'يجب أن يكون وقت المتابعة في المستقبل.',
            'note.required' => 'يرجى كتابة ملاحظة توضيحية.',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function rejectMessages(): array
    {
        return [
            'status.required' => 'يرجى اختيار المرحلة المراد إعادة الطلب إليها.',
            'note.required' => 'يرجى كتابة سبب رفض الإغلاق / إعادة الطلب.',
        ];
    }

    /**
     * A booking awaiting supervisor approval is frozen for non-supervisors.
     *
     * @throws BookingWorkflowException
     */
    public function ensureStatusCanChange(Booking $booking, Employee $actor): void
    {
        if ($booking->status === self::AWAITING_APPROVAL && ! $actor->isAdmin()) {
            throw new BookingWorkflowException('لا يمكن تعديل حالة الطلب وهو بانتظار اعتماد المشرف.');
        }
    }

    /**
     * Move a booking to a new status and record the change. Input must already be validated.
     *
     * @param  array<string, mixed>  $input
     * @return string Success message
     *
     * @throws BookingWorkflowException
     */
    public function changeStatus(Booking $booking, Employee $actor, string $targetStatus, array $input): string
    {
        $this->ensureStatusCanChange($booking, $actor);

        return match (true) {
            $targetStatus === 'received' => $this->deliver($booking, $actor, $input),
            $targetStatus === 'pending' => $this->putOnHold($booking, $actor, $input),
            $this->isLostStatus($targetStatus) => $this->close($booking, $actor, $targetStatus, $input),
            default => $this->advance($booking, $actor, $targetStatus),
        };
    }

    /**
     * @throws BookingWorkflowException
     */
    public function approveClose(Booking $booking, Employee $supervisor): string
    {
        $this->ensureAwaitingApproval($booking);

        $oldStatus = $booking->status;
        $targetStatus = $booking->proposed_status;

        DB::transaction(function () use ($booking, $supervisor, $oldStatus, $targetStatus) {
            $booking->update([
                'status' => $targetStatus,
                'proposed_status' => null,
                'last_contacted_at' => now(),
            ]);

            $this->recordStatusChange($booking, $supervisor, $oldStatus, $targetStatus,
                'تم اعتماد إغلاق الطلب بـ "'.$this->label($targetStatus).'" من قبل المشرف: '.$supervisor->name);
        });

        $booking->assignedTo?->notify(new NewBookingNotification($booking, __('اعتماد إغلاق الطلب'), __('تم اعتماد إغلاق طلب العميل').' '.$booking->client_name.' '.__('كـ').' '.$this->label($targetStatus)));

        return 'تم اعتماد إغلاق الطلب بنجاح.';
    }

    /**
     * @throws BookingWorkflowException
     */
    public function rejectClose(Booking $booking, Employee $supervisor, string $targetStatus, string $reason): string
    {
        $this->ensureAwaitingApproval($booking);

        $oldStatus = $booking->status;

        DB::transaction(function () use ($booking, $supervisor, $oldStatus, $targetStatus, $reason) {
            $booking->update([
                'status' => $targetStatus,
                'proposed_status' => null,
                'last_contacted_at' => now(),
            ]);

            $this->recordStatusChange($booking, $supervisor, $oldStatus, $targetStatus,
                'تم رفض إغلاق الطلب وإعادته لمرحلة "'.$this->label($targetStatus)."\" من قبل المشرف.\nالسبب: ".$reason);
        });

        $booking->assignedTo?->notify(new NewBookingNotification($booking, __('رفض إغلاق الطلب وإعادته لمرحلة أخرى'), __('تم رفض طلب إغلاق العميل').' '.$booking->client_name.' '.__('وإعادته لمرحلة').' '.$this->label($targetStatus)));

        return 'تم رفض الإغلاق وإعادة الطلب لمرحلة '.$this->label($targetStatus).' بنجاح.';
    }

    public function assign(Booking $booking, Employee $assignee): string
    {
        $booking->update(['assigned_to' => $assignee->id]);
        $booking->setRelation('assignedTo', $assignee);

        $assignee->notify(new NewBookingNotification($booking, __('طلب جديد'), __('تم تعيين طلب جديد لك للعميل').' '.$booking->client_name));

        return 'تم توزيع الطلب على الموظف بنجاح';
    }

    /**
     * @param  array<string, mixed>  $input
     */
    private function deliver(Booking $booking, Employee $actor, array $input): string
    {
        $oldStatus = $booking->status;
        $purchasePrice = $this->decimal($input, 'purchase_price');
        $authPrice = $this->decimal($input, 'authorization_price');
        $expenses = $this->decimal($input, 'expenses');
        $netCommission = $this->decimal($input, 'net_commission');
        $downPayment = $this->decimal($input, 'down_payment') ?? $booking->down_payment;
        $monthlyInstallment = $this->decimal($input, 'monthly_installment') ?? $booking->monthly_installment;
        $deliveryNote = $this->filled($input, 'note') ? trim((string) $input['note']) : ($booking->delivery_note ?? null);

        $noteDetails = "تم تسليم الطلب بنجاح (تم الاستلام):\n"
            .'- سعر شراء السيارة: '.$this->money($purchasePrice)."\n"
            .'- سعر تعميد السيارة: '.$this->money($authPrice)."\n"
            .'- المصروفات: '.$this->money($expenses)."\n"
            .'- صافي عمولة الشركة: '.$this->money($netCommission)."\n"
            .'- القسط الشهري: '.($monthlyInstallment > 0 ? number_format((float) $monthlyInstallment, 2).' ر.س' : '—')."\n"
            .'- الدفعة الأولى: '.($downPayment > 0 ? number_format((float) $downPayment, 2).' ر.س' : '—');

        if ($this->filled($input, 'note')) {
            $noteDetails .= "\nملاحظة التسليم: ".$input['note'];
        }

        DB::transaction(function () use ($booking, $actor, $oldStatus, $purchasePrice, $authPrice, $expenses, $netCommission, $downPayment, $monthlyInstallment, $deliveryNote, $noteDetails) {
            $booking->update([
                'status' => 'received',
                'purchase_price' => $purchasePrice,
                'authorization_price' => $authPrice,
                'expenses' => $expenses,
                'net_commission' => $netCommission,
                'down_payment' => $downPayment,
                'monthly_installment' => $monthlyInstallment,
                'delivery_note' => $deliveryNote,
                'delivered_at' => $booking->delivered_at ?? now(),
                'pending_reason' => null,
                'follow_up_at' => null,
                'proposed_status' => null,
                'last_contacted_at' => now(),
            ]);

            $this->recordStatusChange($booking, $actor, $oldStatus, 'received', $noteDetails);
        });

        $this->notifyAssigneeOfChange($booking, $actor, __('تم تسليم الطلب'), __('تم تغيير حالة طلب العميل ').$booking->client_name.__(' إلى تم التسليم'));

        return 'تم نقل الطلب إلى قائمة "تم التسليم" بنجاح.';
    }

    /**
     * @param  array<string, mixed>  $input
     */
    private function putOnHold(Booking $booking, Employee $actor, array $input): string
    {
        $oldStatus = $booking->status;

        DB::transaction(function () use ($booking, $actor, $oldStatus, $input) {
            $booking->update([
                'status' => 'pending',
                'pending_reason' => $input['pending_reason'],
                'follow_up_at' => $input['follow_up_at'],
                'proposed_status' => null,
                'last_contacted_at' => now(),
            ]);

            $this->recordStatusChange($booking, $actor, $oldStatus, 'pending',
                "تفاصيل قيد الانتظار:\n- سبب الانتظار: {$input['pending_reason']}\n- موعد المتابعة: ".Carbon::parse($input['follow_up_at'])->format('d/m/Y H:i')."\n- ملاحظة: {$input['note']}");
        });

        return 'تم نقل الطلب إلى "قيد الانتظار" بنجاح.';
    }

    /**
     * Supervisors close directly; everyone else files a close request for approval.
     *
     * @param  array<string, mixed>  $input
     */
    private function close(Booking $booking, Employee $actor, string $targetStatus, array $input): string
    {
        $oldStatus = $booking->status;
        $employeeNote = $this->filled($input, 'note') ? $input['note'] : null;

        if (! $actor->isAdmin()) {
            DB::transaction(function () use ($booking, $actor, $oldStatus, $targetStatus, $employeeNote) {
                $booking->update([
                    'status' => self::AWAITING_APPROVAL,
                    'proposed_status' => $targetStatus,
                    'last_contacted_at' => now(),
                ]);

                $this->recordStatusChange($booking, $actor, $oldStatus, self::AWAITING_APPROVAL,
                    'طلب إغلاق الحجز بـ "'.$this->label($targetStatus).'" بانتظار اعتماد المشرف.'
                    .($employeeNote !== null ? "\nملاحظة الموظف: ".$employeeNote : ''));
            });

            return 'تم إرسال طلب إغلاق الحجز للمشرف للاعتماد.';
        }

        DB::transaction(function () use ($booking, $actor, $oldStatus, $targetStatus, $employeeNote) {
            $booking->update([
                'status' => $targetStatus,
                'proposed_status' => null,
                'pending_reason' => null,
                'follow_up_at' => null,
                'last_contacted_at' => now(),
            ]);

            $this->recordStatusChange($booking, $actor, $oldStatus, $targetStatus,
                'تم إغلاق الحجز مباشرة من قبل المشرف إلى "'.$this->label($targetStatus).'".'
                .($employeeNote !== null ? "\nملاحظة المشرف: ".$employeeNote : ''));
        });

        return 'تم إغلاق الحجز بنجاح.';
    }

    /**
     * A normal pipeline move (including returning from pending or closed).
     */
    private function advance(Booking $booking, Employee $actor, string $targetStatus): string
    {
        $oldStatus = $booking->status;

        DB::transaction(function () use ($booking, $actor, $oldStatus, $targetStatus) {
            $booking->update([
                'status' => $targetStatus,
                'proposed_status' => null,
                'pending_reason' => null,
                'follow_up_at' => null,
                'last_contacted_at' => now(),
            ]);

            $this->recordStatusChange($booking, $actor, $oldStatus, $targetStatus,
                'تم تغيير الحالة من "'.$this->label($oldStatus).'" إلى "'.$this->label($targetStatus).'"');
        });

        $this->notifyAssigneeOfChange($booking, $actor, __('تحديث حالة الطلب'), __('تم تغيير حالة طلب العميل').' '.$booking->client_name.' '.__('إلى').' '.$this->label($targetStatus));

        $this->sendStatusWhatsApp($booking, $targetStatus);

        return 'تم تحديث حالة الطلب بنجاح';
    }

    private function sendStatusWhatsApp(Booking $booking, string $targetStatus): void
    {
        $template = $this->cache->rememberSetting('whatsapp_template_status_update', '');

        if (empty($template) || empty($booking->client_phone)) {
            return;
        }

        $message = str_replace(
            ['{customer_name}', '{car_name}', '{status}'],
            [$booking->client_name, $booking->car?->name ?? 'السيارة', $this->label($targetStatus)],
            $template,
        );

        app(TwilioWhatsAppService::class)->sendWhatsApp($booking->client_phone, $message);
    }

    private function recordStatusChange(Booking $booking, Employee $actor, ?string $oldStatus, string $newStatus, string $note): void
    {
        BookingNote::create([
            'booking_id' => $booking->id,
            'employee_id' => $actor->id,
            'note' => $note,
            'type' => 'status_change',
            'old_status' => $oldStatus,
            'new_status' => $newStatus,
        ]);
    }

    private function notifyAssigneeOfChange(Booking $booking, Employee $actor, string $title, string $body): void
    {
        $assignee = $booking->assignedTo;

        if ($assignee && $assignee->id !== $actor->id) {
            $assignee->notify(new NewBookingNotification($booking, $title, $body));
        }
    }

    /**
     * @throws BookingWorkflowException
     */
    private function ensureAwaitingApproval(Booking $booking): void
    {
        if ($booking->status !== self::AWAITING_APPROVAL || empty($booking->proposed_status)) {
            throw new BookingWorkflowException('الطلب ليس بانتظار اعتماد الإغلاق.');
        }
    }

    private function isLostStatus(string $status): bool
    {
        return (Booking::STATUSES[$status]['is_lost'] ?? false)
            || (Booking::STATUSES[$status]['group'] ?? '') === 'lost';
    }

    private function label(?string $status): string
    {
        return Booking::STATUSES[$status]['label'] ?? (string) $status;
    }

    private function money(?float $amount): string
    {
        return $amount !== null ? number_format($amount, 2).' ر.س' : '—';
    }

    /**
     * @param  array<string, mixed>  $input
     */
    private function decimal(array $input, string $key): ?float
    {
        return $this->filled($input, $key) ? (float) $input[$key] : null;
    }

    /**
     * @param  array<string, mixed>  $input
     */
    private function filled(array $input, string $key): bool
    {
        $value = $input[$key] ?? null;

        return ! is_null($value) && ! (is_string($value) && trim($value) === '');
    }
}
