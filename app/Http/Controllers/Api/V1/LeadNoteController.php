<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Api\Contracts\ApiResponse;
use App\Http\Controllers\Api\ApiBaseController;
use App\Http\Requests\Api\V1\Leads\StoreLeadNoteRequest;
use App\Models\Employee;
use App\Models\Lead;
use App\Models\LeadNote;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/**
 * Internal notes on a lead, from every channel (manual, WhatsApp...).
 */
class LeadNoteController extends ApiBaseController
{
    public function index(Lead $lead): ApiResponse
    {
        Gate::authorize('view', $lead);

        $notes = $lead->notes()->with('employee:id,name')->limit(200)->get();

        return $this->respondSuccess($notes->map(fn (LeadNote $note) => $note->toPayload())->values());
    }

    public function store(StoreLeadNoteRequest $request, Lead $lead): ApiResponse
    {
        Gate::authorize('update', $lead);

        $note = $lead->notes()->create([
            'employee_id' => $request->user('employee')?->id,
            'body' => $request->validated('body'),
            'source' => 'manual',
        ]);

        return $this->respondCreated($note->load('employee:id,name')->toPayload(), 'تمت إضافة الملاحظة');
    }

    public function destroy(Request $request, Lead $lead, LeadNote $note): ApiResponse
    {
        Gate::authorize('view', $lead);

        /** @var Employee $employee */
        $employee = $request->user('employee');

        if ((int) $note->lead_id !== (int) $lead->id) {
            abort(404);
        }
        if (! $note->isDeletableBy($employee)) {
            abort(403, 'Only the author or an admin can delete this note.');
        }

        $note->delete();

        return $this->respondDeleted('تم حذف الملاحظة');
    }
}
