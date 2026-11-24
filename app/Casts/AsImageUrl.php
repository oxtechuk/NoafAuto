<?php

declare(strict_types=1);

namespace App\Casts;

use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

final class AsImageUrl implements CastsAttributes
{
    public function get(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (str_contains($value, '127.0.0.1:8099') || str_contains($value, 'localhost:8099')) {
            $value = str_replace(['http://127.0.0.1:8099', 'http://localhost:8099'], config('app.url'), $value);
        }

        if (str_starts_with($value, 'http://') || str_starts_with($value, 'https://')) {
            return $value;
        }

        $cleanPath = ltrim($value, '/');
        if (str_starts_with($cleanPath, 'images/') || str_starts_with($cleanPath, 'assets/')) {
            return asset($cleanPath);
        }

        if (str_starts_with($cleanPath, 'storage/')) {
            return asset($cleanPath);
        }

        return asset('storage/'.$cleanPath);
    }

    public function set(Model $model, string $key, mixed $value, array $attributes): mixed
    {
        return $value;
    }
}
