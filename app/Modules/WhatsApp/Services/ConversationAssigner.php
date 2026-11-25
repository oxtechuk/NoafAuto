<?php

declare(strict_types=1);

namespace App\Modules\WhatsApp\Services;

use App\Models\Employee;
use App\Modules\WhatsApp\Models\WhatsAppConversation;
use App\Services\BookingAssignmentService;

/**
 * Hands each new WhatsApp conversation to one sales rep: the owner of the
 * linked lead when there is one, otherwise the next rep in round-robin order.
 */
class ConversationAssigner
{
    public function __construct(
        private readonly WhatsAppSettings $settings,
        private readonly BookingAssignmentService $assignment,
    ) {}

    public function assign(WhatsAppConversation $conversation): ?Employee
    {
        if ($conversation->assigned_to || ! $this->settings->get('inbox.auto_assign', true)) {
            return null;
        }

        $reps = $this->assignment->getEligibleSalesReps()->values();
        if ($reps->isEmpty()) {
            return null;
        }

        $leadOwnerId = $conversation->lead?->assigned_to;
        $rep = $leadOwnerId ? $reps->firstWhere('id', (int) $leadOwnerId) : null;
        $rep ??= $this->nextInRotation($reps->all(), $conversation->id);

        $conversation->forceFill(['assigned_to' => $rep->id, 'assigned_at' => now()])->save();

        return $rep;
    }

    /**
     * @param  list<Employee>  $reps
     */
    private function nextInRotation(array $reps, int $exceptConversationId): Employee
    {
        $lastId = WhatsAppConversation::query()
            ->whereKeyNot($exceptConversationId)
            ->whereIn('assigned_to', array_map(fn (Employee $rep) => $rep->id, $reps))
            ->whereNotNull('assigned_at')
            ->orderByDesc('assigned_at')
            ->orderByDesc('id')
            ->value('assigned_to');

        foreach ($reps as $index => $rep) {
            if ($lastId !== null && $rep->id === (int) $lastId) {
                return $reps[$index + 1] ?? $reps[0];
            }
        }

        return $reps[0];
    }
}
