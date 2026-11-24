<?php

declare(strict_types=1);

namespace App\Modules\WhatsApp\Models;

use App\Models\Lead;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WhatsAppConversation extends Model
{
    protected $table = 'wa_conversations';

    protected $fillable = [
        'phone', 'name', 'lead_id', 'assistant_session_id', 'last_inbound_at', 'last_message_at', 'ai_paused_until', 'unread_count',
    ];

    protected $casts = [
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

    /**
     * WhatsApp's 24-hour customer service window: free-form messages are only
     * allowed within 24h of the customer's last message; otherwise use a template.
     */
    public function isWithinServiceWindow(): bool
    {
        return $this->last_inbound_at !== null && $this->last_inbound_at->gt(now()->subHours(24));
    }
}
