<?php

declare(strict_types=1);

namespace App\Modules\AiAssistant\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Single row holding the assistant configuration. The provider API key is
 * stored encrypted and never serialized.
 */
class AssistantSettingRecord extends Model
{
    protected $table = 'ai_assistant_settings';

    protected $fillable = ['data', 'api_key'];

    protected $hidden = ['api_key'];

    protected $casts = [
        'data' => 'array',
        'api_key' => 'encrypted',
    ];
}
