<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Company extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function branding(): HasOne
    {
        return $this->hasOne(CompanyBranding::class)->where('is_active', true)->latestOfMany();
    }

    public function brandings(): HasMany
    {
        return $this->hasMany(CompanyBranding::class);
    }
}
