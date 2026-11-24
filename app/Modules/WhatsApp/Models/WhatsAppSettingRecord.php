<?php

declare(strict_types=1);

namespace App\Modules\WhatsApp\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Single row: provider options (data) + credentials (secrets, encrypted, never serialized).
 */
class WhatsAppSettingRecord extends Model
{
    protected $table = 'wa_settings';

    protected $fillable = ['data', 'secrets'];

    protected $hidden = ['secrets'];

    protected $casts = [
        'data' => 'array',
        'secrets' => 'encrypted:array',
    ];
}
