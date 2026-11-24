<?php

declare(strict_types=1);

namespace App\Modules\WhatsApp\Models;

use App\Models\Employee;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WhatsAppMessage extends Model
{
    public const STATUS_ORDER = ['queued' => 0, 'sent' => 1, 'delivered' => 2, 'read' => 3];

    protected $table = 'wa_messages';

    protected $fillable = [
        'conversation_id', 'direction', 'provider', 'type', 'body', 'event', 'provider_message_id', 'status', 'error', 'sent_by', 'payload',
    ];

    protected $casts = [
        'payload' => 'array',
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(WhatsAppConversation::class, 'conversation_id');
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'sent_by');
    }

    /** Apply a delivery status without going backwards (webhooks can arrive out of order). */
    public function advanceStatus(string $status, ?string $error = null): void
    {
        if ($status === 'failed') {
            $this->fill(['status' => 'failed', 'error' => $error ?? $this->error])->save();

            return;
        }

        if ((self::STATUS_ORDER[$status] ?? -1) > (self::STATUS_ORDER[$this->status] ?? -1)) {
            $this->fill(['status' => $status])->save();
        }
    }
}
