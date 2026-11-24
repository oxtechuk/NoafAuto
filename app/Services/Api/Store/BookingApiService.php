<?php

declare(strict_types=1);

namespace App\Services\Api\Store;

use App\Models\Booking;
use App\Models\Car;
use App\Models\Employee;
use App\Models\Setting;
use App\Notifications\NewBookingNotification;
use App\Services\Api\Store\Data\BookingData;
use App\Services\BookingAssignmentService;
use App\Services\TwilioWhatsAppService;
use Illuminate\Support\Facades\Notification;

final class BookingApiService
{
    public function __construct(
        private readonly BookingAssignmentService $assignmentService,
        private readonly TwilioWhatsAppService $whatsAppService,
    ) {}

    public function create(BookingData $data): Booking
    {
        $car = Car::findOrFail($data->car_id);

        $booking = Booking::create($data->toDatabase());

        try {
            $this->assignmentService->autoAssign($booking);
        } catch (\Throwable $e) {
            logger()->warning('Auto assignment failed for booking '.$booking->id.': '.$e->getMessage());
        }

        try {
            $admins = Employee::where('role', 'admin')->orWhere('id', 1)->get();
            if ($admins->isNotEmpty()) {
                Notification::send($admins, new NewBookingNotification($booking));
            }
        } catch (\Throwable $e) {
            logger()->warning('Admin notification failed for booking '.$booking->id.': '.$e->getMessage());
        }

        try {
            $this->sendWelcomeWhatsApp($booking, $car);
        } catch (\Throwable $e) {
            logger()->warning('WhatsApp notification failed for booking '.$booking->id.': '.$e->getMessage());
        }

        return $booking;
    }

    private function sendWelcomeWhatsApp(Booking $booking, Car $car): void
    {
        if (empty($booking->client_phone)) {
            return;
        }

        $template = (string) Setting::where('key', 'whatsapp_template_new_lead')->value('value');
        $variables = ['customer_name' => (string) $booking->client_name, 'car_name' => (string) $car->name, 'status' => 'جديد'];
        $message = strtr($template, ['{customer_name}' => $variables['customer_name'], '{car_name}' => $variables['car_name'], '{status}' => $variables['status']]);

        // The WhatsApp module (when connected) may use its own text or an approved template for this event.
        $this->whatsAppService->sendWhatsApp($booking->client_phone, $message, 'booking_created', $variables);
    }
}
