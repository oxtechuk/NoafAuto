<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\LeadNoteFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * Internal note on a CRM lead, optionally written on a specific record (e.g. a WhatsApp conversation or message).
 */
class LeadNote extends Model
{
    /** @use HasFactory<LeadNoteFactory> */
    use HasFactory;

    protected $fillable = ['lead_id', 'employee_id', 'body', 'source', 'notable_type', 'notable_id'];

    protected $touches = ['lead'];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function notable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Admins and the note's author may delete it.
     */
    public function isDeletableBy(Employee $employee): bool
    {
        return $employee->isAdmin() || (int) $this->employee_id === (int) $employee->id;
    }

    /**
     * @return array{id: int, body: string, source: string, employee_id: int|null, employee_name: string|null, notable_type: string|null, notable_id: int|null, created_at: string|null}
     */
    public function toPayload(): array
    {
        return [
            'id' => $this->id,
            'body' => $this->body,
            'source' => $this->source,
            'employee_id' => $this->employee_id,
            'employee_name' => $this->employee?->name,
            'notable_type' => $this->notable_type,
            'notable_id' => $this->notable_id,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
