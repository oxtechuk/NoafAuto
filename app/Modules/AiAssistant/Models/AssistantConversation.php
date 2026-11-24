<?php

declare(strict_types=1);

namespace App\Modules\AiAssistant\Models;

use App\Models\Lead;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AssistantConversation extends Model
{
    protected $table = 'ai_conversations';

    protected $fillable = [
        'session_id', 'channel', 'locale', 'page_context', 'profile', 'lead_id',
        'provider', 'model', 'messages_count', 'tokens_in', 'tokens_out', 'ip_hash', 'last_activity_at',
    ];

    protected $casts = [
        'page_context' => 'array',
        'profile' => 'array',
        'last_activity_at' => 'datetime',
    ];

    public function messages(): HasMany
    {
        return $this->hasMany(AssistantMessage::class, 'conversation_id')->orderBy('id');
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }
}
