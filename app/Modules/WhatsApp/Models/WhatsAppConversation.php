<?php

declare(strict_types=1);

namespace App\Modules\WhatsApp\Models;

use App\Models\Employee;
use App\Models\Lead;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WhatsAppConversation extends Model
{
    /** Contact statuses of a conversation (key => Arabic label). */
    public const STATUSES = ['open' => 'شغال', 'pending' => 'منتظر', 'closed' => 'مقفول'];

    /** lead_notes.notable_type for notes written on a conversation. */
    public const MORPH_ALIAS = 'whatsapp_conversation';

    protected $table = 'wa_conversations';

    protected $fillable = [
        'phone', 'name', 'lead_id', 'assigned_to', 'assigned_at', 'status', 'tags', 'assistant_session_id', 'last_inbound_at', 'last_message_at', 'ai_paused_until', 'unread_count',
    ];

    protected $attributes = [
        'status' => 'open',
    ];

    protected $casts = [
        'tags' => 'array',
        'assigned_at' => 'datetime',
        'last_inbound_at' => 'datetime',
        'last_message_at' => 'datetime',
        'ai_paused_until' => 'datetime',
    ];

    public function messages(): HasMany
    {
        return $this->hasMany(WhatsAppMessage::class, 'conversation_id')->orderBy('id');
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'assigned_to');
    }

    /**
     * Admins see every conversation; everyone else only the ones assigned to them.
     *
     * @param  Builder<self>  $query
     */
    public function scopeVisibleTo(Builder $query, Employee $employee): void
    {
        if (! $employee->isAdmin()) {
            $query->where('assigned_to', $employee->id);
        }
    }

    public function isVisibleTo(Employee $employee): bool
    {
        return $employee->isAdmin() || (int) $this->assigned_to === (int) $employee->id;
    }

    /**
     * WhatsApp's 24-hour customer service window: free-form messages are only
     * allowed within 24h of the customer's last message; otherwise use a template.
     */
    public function isWithinServiceWindow(): bool
    {
        return $this->last_inbound_at !== null && $this->last_inbound_at->gt(now()->subHours(24));
    }
}
