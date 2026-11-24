<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UpdateHistory extends Model
{
    use HasFactory;

    protected $table = 'update_history';

    /**
     * @var list<string>
     */
    public const ACTIVE_STATUSES = ['queued', 'running'];

    public const FINAL_STATUSES = ['success', 'failed', 'needs_review'];

    protected $fillable = [
        'from_version',
        'to_version',
        'status',
        'source',
        'step',
        'run_url',
        'triggered_by',
        'started_at',
        'finished_at',
        'log',
        'error',
    ];

    public function triggeredBy(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'triggered_by');
    }

    /**
     * Append a timestamped line to the run log.
     */
    public function appendLog(string $line): void
    {
        $log = (array) ($this->log ?? []);
        $log[] = '['.now()->format('H:i:s').'] '.$line;
        $this->log = $log;
    }

    public function isActive(): bool
    {
        return in_array($this->status, self::ACTIVE_STATUSES, true);
    }

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
        'log' => 'array',
    ];
}
