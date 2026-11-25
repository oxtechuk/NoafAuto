<?php

namespace App\Models;

use App\Casts\AsImageUrl;
use App\Services\Cache\BaseCacheService;
use Database\Factories\CarFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;
use Spatie\Translatable\HasTranslations;

class Car extends Model
{
    /** @use HasFactory<CarFactory> */
    use HasFactory, HasTranslations;

    public const HIGHLIGHT_OPTIONS = [
        'new_arrival' => ['ar' => 'أحدث السيارات', 'en' => 'New Arrivals'],
        'featured' => ['ar' => 'سيارات مختارة', 'en' => 'Featured'],
        'trending' => ['ar' => 'الأكثر طلباً', 'en' => 'Trending'],
        'exclusive' => ['ar' => 'إصدار خاص', 'en' => 'Exclusive'],
    ];

    public $translatable = ['name', 'description', 'features', 'slug'];

    protected $fillable = [
        'brand_id', 'category_id', 'car_model_id', 'name', 'slug', 'model', 'year', 'type',
        'color', 'colors', 'cash_price', 'min_down_payment', 'min_installment',
        'description', 'features', 'specs', 'horsepower', 'thumbnail', 'badge_color', 'is_featured', 'is_active', 'is_highlighted', 'views',
        'availability_status',
    ];

    protected $appends = ['main_image'];

    protected $casts = [
        'colors' => 'array',
        'specs' => 'array',
        'is_featured' => 'boolean',
        'is_active' => 'boolean',
        'horsepower' => 'integer',
        'thumbnail' => AsImageUrl::class,
    ];

    public function getColorsAttribute(mixed $value): ?array
    {
        $colors = is_string($value) ? json_decode($value, true) : $value;

        if (! is_array($colors)) {
            return null;
        }

        return array_map(function (mixed $color): array {
            $color = is_array($color) ? $color : [];

            if (isset($color['image']) && $color['image'] !== null) {
                $color['image'] = Storage::disk('public')->url($color['image']);
            }

            return $color;
        }, $colors);
    }

    public function getSpecsAttribute(mixed $value): ?array
    {
        $specs = is_string($value) ? json_decode($value, true) : $value;

        return is_array($specs) ? $specs : null;
    }

    public function getHorsepowerAttribute(): ?int
    {
        return self::parseHorsepower($this->specs['hp'] ?? null);
    }

    /**
     * Extract the numeric horsepower from a free-form specs value (e.g. "250 HP").
     */
    public static function parseHorsepower(mixed $hp): ?int
    {
        if ($hp === null || $hp === '') {
            return null;
        }

        if (! preg_match('/\d+/', str_replace(',', '', (string) $hp), $matches)) {
            return null;
        }

        return min((int) $matches[0], 65535);
    }

    public function specifications()
    {
        return $this->belongsToMany(Specification::class, 'car_specification');
    }

    public function features_list()
    {
        return $this->belongsToMany(Feature::class, 'car_feature');
    }

    public function safety_features()
    {
        return $this->belongsToMany(SafetyFeature::class, 'car_safety_feature');
    }

    protected static function booted(): void
    {
        static::saving(function (Car $car) {
            if ($car->car_model_id) {
                $carModel = CarModel::find($car->car_model_id);
                if ($carModel) {
                    $car->model = $carModel->getTranslation('name', 'en', false)
                        ?? $carModel->getTranslation('name', 'ar', false)
                        ?? $carModel->name;
                }
            }

            $car->setAttribute('horsepower', self::parseHorsepower($car->specs['hp'] ?? null));
        });
    }

    public function carModel(): BelongsTo
    {
        return $this->belongsTo(CarModel::class);
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(CarCategory::class, 'category_id');
    }

    public function images(): HasMany
    {
        return $this->hasMany(CarImage::class)->orderBy('sort_order');
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    public function offers()
    {
        return $this->belongsToMany(Offer::class, 'car_offer');
    }

    public function activeOffers()
    {
        return $this->belongsToMany(Offer::class, 'car_offer')
            ->where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('ends_at')->orWhere('ends_at', '>=', now());
            })
            ->latest();
    }

    public static function getDefaultCarImage(): string
    {
        $path = null;
        try {
            $path = app(BaseCacheService::class)->rememberSetting('default_car_image');
        } catch (\Throwable) {
            // cache or db not reachable
        }

        if (! $path) {
            $path = 'settings/tjJk5THeSKGpLVocAHCqqSvhy9S055LxICF8iXEU.webp';
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        $cleanPath = ltrim($path, '/');
        if (str_starts_with($cleanPath, 'images/') || str_starts_with($cleanPath, 'assets/') || str_starts_with($cleanPath, 'storage/')) {
            return asset($cleanPath);
        }

        return asset('storage/'.$cleanPath);
    }

    public function isImageDeleted(?string $rawPath): bool
    {
        if (! $rawPath) {
            return true;
        }

        if (app()->runningUnitTests()) {
            return false;
        }

        if (str_starts_with($rawPath, 'http://') || str_starts_with($rawPath, 'https://')) {
            $parsed = parse_url($rawPath, PHP_URL_PATH);
            if ($parsed) {
                $localPath = ltrim($parsed, '/');
                if (file_exists(public_path($localPath))) {
                    return false;
                }
                if (str_starts_with($localPath, 'storage/')) {
                    $storagePath = substr($localPath, 8);

                    return ! Storage::disk('public')->exists($storagePath) && ! file_exists(public_path($localPath));
                }

                return true;
            }

            return false;
        }

        $cleanPath = ltrim($rawPath, '/');
        if (str_starts_with($cleanPath, 'images/') || str_starts_with($cleanPath, 'assets/')) {
            return ! file_exists(public_path($cleanPath));
        }

        if (str_starts_with($cleanPath, 'storage/')) {
            $cleanPath = substr($cleanPath, 8);
        }

        return ! Storage::disk('public')->exists($cleanPath) && ! file_exists(public_path('storage/'.$cleanPath));
    }

    public function getMainImageAttribute(): ?string
    {
        $rawThumb = $this->getRawOriginal('thumbnail');
        if ($this->thumbnail && ! $this->isImageDeleted($rawThumb)) {
            return $this->thumbnail;
        }

        if ($this->relationLoaded('images') && $this->images->isNotEmpty()) {
            foreach ($this->images as $img) {
                if (! $this->isImageDeleted($img->getRawOriginal('image_path'))) {
                    return $img->image_path;
                }
            }
        }

        return self::getDefaultCarImage();
    }

    public function getActiveOfferAttribute()
    {
        if ($this->relationLoaded('activeOffers')) {
            return $this->activeOffers->first();
        }

        return null;
    }

    public function getCurrentPriceAttribute()
    {
        $offer = $this->activeOffer;
        if ($offer && $offer->special_price) {
            return $offer->special_price;
        }

        return $this->cash_price;
    }

    public function calculateInstallment(int $downPayment, int $months, float $interestRate): array
    {
        $principal = $this->cash_price - $downPayment;
        $monthlyRate = $interestRate / 100 / 12;

        if ($monthlyRate == 0) {
            $monthly = $principal / $months;
        } else {
            $monthly = $principal * ($monthlyRate * pow(1 + $monthlyRate, $months))
                     / (pow(1 + $monthlyRate, $months) - 1);
        }

        return [
            'monthly' => round($monthly),
            'total' => round($monthly * $months) + $downPayment,
            'principal' => $principal,
        ];
    }

    public static function generateUniqueSlug(string $name, int $year, string $locale, ?int $excludeCarId = null): string
    {
        $baseSlug = self::slugify($name);

        if (! str_contains($baseSlug, (string) $year)) {
            $baseSlug .= '-'.$year;
        }

        $slug = $baseSlug;
        $counter = 1;

        while (true) {
            $query = self::where(function ($q) use ($slug) {
                $q->where('slug->en', $slug)
                    ->orWhere('slug->ar', $slug);
            });

            if ($excludeCarId) {
                $query->where('id', '!=', $excludeCarId);
            }

            if (! $query->exists()) {
                break;
            }

            $slug = $baseSlug.'-'.$counter;
            $counter++;
        }

        return $slug;
    }

    private static function slugify(string $text): string
    {
        $text = mb_strtolower($text, 'UTF-8');
        $slug = preg_replace('/[^\p{L}\p{N}]+/u', '-', $text);
        $slug = preg_replace('/-+/', '-', $slug);

        return trim($slug, '-');
    }
}
