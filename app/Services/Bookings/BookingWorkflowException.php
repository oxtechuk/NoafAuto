<?php

namespace App\Services\Bookings;

use RuntimeException;

/**
 * A booking workflow rule was violated (e.g. changing a booking that awaits supervisor approval).
 */
class BookingWorkflowException extends RuntimeException {}
