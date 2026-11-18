<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ModuleRegistry extends Model
{
    use HasFactory;

    protected $table = 'modules_registry';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'key',
        'name',
        'version',
        'enabled',
        'config',
        'installed_at',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'enabled' => 'boolean',
        'config' => 'array',
        'installed_at' => 'datetime',
    ];
}
