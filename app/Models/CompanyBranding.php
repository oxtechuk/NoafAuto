<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CompanyBranding extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'logo_path',
        'primary_color',
        'primary_hover_color',
        'secondary_color',
        'accent_color',
        'sidebar_bg_color',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
