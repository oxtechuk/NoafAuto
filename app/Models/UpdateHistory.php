<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UpdateHistory extends Model
{
    use HasFactory;

    protected $table = 'update_history';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'from_version',
        'to_version',
        'status',
        'started_at',
        'finished_at',
        'log',
        'error',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
        'log' => 'array',
    ];
}
