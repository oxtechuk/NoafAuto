<?php

declare(strict_types=1);

namespace App\Modules\AiAssistant\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssistantMessage extends Model
{
    public const ROLE_USER = 'user';

    public const ROLE_MODEL = 'model';

    public const ROLE_TOOL = 'tool';

    protected $table = 'ai_messages';

    protected $fillable = [
        'conversation_id', 'role', 'content', 'payload', 'cards', 'guard_flags', 'tokens_in', 'tokens_out', 'latency_ms',
    ];

    protected $casts = [
        'payload' => 'array',
        'cards' => 'array',
        'guard_flags' => 'array',
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(AssistantConversation::class, 'conversation_id');
    }
}
