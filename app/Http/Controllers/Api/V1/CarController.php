<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Api\Contracts\ApiResponse;
use App\Http\Api\Response\Builder\ApiResponseBuilder;
use App\Http\Controllers\Api\ApiBaseController;
use App\Http\Requests\Api\V1\Cars\CarRequest;
use App\Http\Resources\V1\CarResource;
use App\Models\Brand;
use App\Models\Car;
use App\Models\CarCategory;
use App\Models\CarImage;
use App\Models\CarType;
use App\Models\Feature;
use App\Models\SafetyFeature;
use App\Models\Specification;
use App\Services\ImageOptimizerService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;

class CarController extends ApiBaseController
{
    private const RELATIONS = [
        'brand',
        'category',
        'carModel',
        'images',
        'specifications',
        'features_list',
        'safety_features',
    ];

    private const INDEX_RELATIONS = ['brand', 'category', 'carModel'];

    private const MAX_PER_PAGE = 100;

    public function __construct(
        ApiResponseBuilder $responseBuilder,
        protected ImageOptimizerService $imageOptimizer
    ) {
        parent::__construct($responseBuilder);
    }

    public function index(Request $request): ApiResponse
    {
        Gate::authorize('viewAny', Car::class);

        $query = Car::query()->with(self::INDEX_RELATIONS);

        if ($request->filled('brand_id')) {
            $query->where('brand_id', $request->input('brand_id'));
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->input('category_id'));
        }

        if ($request->filled('car_model_id')) {
            $query->where('car_model_id', $request->input('car_model_id'));
        }

        if ($request->filled('year')) {
            $query->where('year', $request->integer('year'));
        }

        if ($request->filled('type')) {
            $query->where('type', $request->input('type'));
        }

        if ($request->filled('availability_status')) {
            $query->where('availability_status', $request->input('availability_status'));
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->has('is_featured')) {
            $query->where('is_featured', $request->boolean('is_featured'));
        }

        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('model', 'like', "%{$search}%");
            });
        }

        $perPage = min(max((int) $request->integer('per_page', 20), 1), self::MAX_PER_PAGE);
        $cars = $query->latest()->paginate($perPage)->withQueryString();
        $cars->setCollection(collect(CarResource::collection($cars->getCollection())->resolve()));

        return $this->respondPaginated($cars, 'Cars retrieved successfully');
    }

    public function store(CarRequest $request): ApiResponse
    {
        Gate::authorize('create', Car::class);

        $data = $request->validated();
        $nameEn = $data['name']['en'] ?? $data['name']['ar'];
        $data['model'] = $data['model'] ?? $nameEn;
        $baseSlug = Str::slug($nameEn) ?: 'car-'.Str::random(6);
        $data['slug'] = [
            'ar' => Str::slug($data['name']['ar']) ?: $baseSlug,
            'en' => $baseSlug,
        ];

        if ($request->hasFile('thumbnail')) {
            $data['thumbnail'] = $this->imageOptimizer->storeAndOptimize(
                $request->file('thumbnail'),
                'cars/thumbnails',
                ['maxWidth' => 1000, 'quality' => 82]
            );
        }

        $colors = $this->buildColorsArray($request);
        if ($colors !== null) {
            $data['colors'] = $colors;
        }

        $data['cash_price'] = isset($data['cash_price']) && is_numeric($data['cash_price']) ? (float) $data['cash_price'] : 0.0;
        $data['min_down_payment'] = isset($data['min_down_payment']) && is_numeric($data['min_down_payment']) ? (float) $data['min_down_payment'] : 0.0;
        $data['min_installment'] = isset($data['min_installment']) && is_numeric($data['min_installment']) ? (float) $data['min_installment'] : 0.0;
        $data['year'] = isset($data['year']) && is_numeric($data['year']) ? (int) $data['year'] : (int) date('Y');
        $data['is_active'] = $request->boolean('is_active', true);
        $data['is_featured'] = $request->boolean('is_featured', false);

        $car = Car::create($data);

        if ($request->has('specifications')) {
            $car->specifications()->sync((array) $request->input('specifications', []));
        }
        if ($request->has('features_list')) {
            $car->features_list()->sync((array) $request->input('features_list', []));
        }
        if ($request->has('safety_features')) {
            $car->safety_features()->sync((array) $request->input('safety_features', []));
        }

        $this->uploadGalleryImages($request, $car);

        return $this->respondCreated($this->carData($car), 'Car created successfully');
    }

    public function show(Car $car): ApiResponse
    {
        Gate::authorize('view', $car);

        return $this->respondSuccess($this->carData($car));
    }

    public function update(CarRequest $request, Car $car): ApiResponse
    {
        Gate::authorize('update', $car);

        $data = $request->validated();
        if (isset($data['name'])) {
            $nameEn = $data['name']['en'] ?? $data['name']['ar'];
            $baseSlug = Str::slug($nameEn) ?: 'car-'.Str::random(6);
            $data['slug'] = [
                'ar' => Str::slug($data['name']['ar']) ?: $baseSlug,
                'en' => $baseSlug,
            ];
        }

        if ($request->hasFile('thumbnail')) {
            $data['thumbnail'] = $this->imageOptimizer->storeAndOptimize(
                $request->file('thumbnail'),
                'cars/thumbnails',
                ['maxWidth' => 1000, 'quality' => 82]
            );
        }

        $colors = $this->buildColorsArray($request);
        if ($colors !== null) {
            $data['colors'] = $colors;
        }

        $car->update($data);

        if ($request->has('specifications')) {
            $car->specifications()->sync((array) $request->input('specifications', []));
        }
        if ($request->has('features_list')) {
            $car->features_list()->sync((array) $request->input('features_list', []));
        }
        if ($request->has('safety_features')) {
            $car->safety_features()->sync((array) $request->input('safety_features', []));
        }

        $this->uploadGalleryImages($request, $car);

        return $this->respondSuccess($this->carData($car), 'Car updated successfully');
    }

    public function destroy(Car $car): ApiResponse
    {
        Gate::authorize('delete', $car);

        $car->delete();

        return $this->respondDeleted('Car deleted successfully');
    }

    public function metaOptions(): ApiResponse
    {
        $brands = Brand::where('is_active', true)->orderBy('name')->get()->map(fn ($b) => [
            'id' => $b->id,
            'name' => $b->getTranslation('name', app()->getLocale(), false) ?: $b->name,
            'logo' => $b->logo,
        ]);

        $categories = CarCategory::activeOrdered()->get()->map(fn ($c) => [
            'id' => $c->id,
            'name' => $c->getTranslation('name', app()->getLocale(), false) ?: $c->name,
            'slug' => $c->slug,
        ]);

        $carTypes = CarType::activeOrdered()->get()->map(fn ($t) => [
            'id' => $t->id,
            'name' => $t->getTranslation('name', app()->getLocale(), false) ?: $t->name,
            'slug' => $t->slug,
        ]);

        $specifications = Specification::all()->map(fn ($s) => [
            'id' => $s->id,
            'name' => $s->getTranslation('name', app()->getLocale(), false) ?: $s->name,
            'icon' => $s->icon,
        ]);

        $features = Feature::all()->map(fn ($f) => [
            'id' => $f->id,
            'name' => $f->getTranslation('name', app()->getLocale(), false) ?: $f->name,
            'icon' => $f->icon,
        ]);

        $safetyFeatures = SafetyFeature::all()->map(fn ($sf) => [
            'id' => $sf->id,
            'name' => $sf->getTranslation('name', app()->getLocale(), false) ?: $sf->name,
            'icon' => $sf->icon,
        ]);

        return $this->respondSuccess([
            'brands' => $brands,
            'categories' => $categories,
            'car_types' => $carTypes,
            'specifications' => $specifications,
            'features' => $features,
            'safety_features' => $safetyFeatures,
            'highlight_options' => Car::HIGHLIGHT_OPTIONS,
        ], 'Car meta options retrieved successfully');
    }

    public function deleteImage(CarImage $image): ApiResponse
    {
        $image->delete();

        return $this->respondDeleted('Car image deleted successfully');
    }

    /**
     * @return array<string, mixed>
     */
    private function carData(Car $car): array
    {
        $car->load(self::RELATIONS);

        return (new CarResource($car))->resolve();
    }

    private function uploadGalleryImages(Request $request, Car $car): void
    {
        if ($request->hasFile('interior_images')) {
            foreach ($request->file('interior_images') as $image) {
                $car->images()->create([
                    'image_path' => $this->imageOptimizer->storeAndOptimize($image, 'cars/gallery', ['maxWidth' => 1600, 'quality' => 82]),
                    'type' => 'interior',
                ]);
            }
        }

        if ($request->hasFile('exterior_images')) {
            foreach ($request->file('exterior_images') as $image) {
                $car->images()->create([
                    'image_path' => $this->imageOptimizer->storeAndOptimize($image, 'cars/gallery', ['maxWidth' => 1600, 'quality' => 82]),
                    'type' => 'exterior',
                ]);
            }
        }
    }

    /**
     * @return array<int, array{name: string, hex: string, image: ?string}>|null
     */
    private function buildColorsArray(Request $request): ?array
    {
        if (! $request->has('color_names') && ! $request->has('colors')) {
            return null;
        }

        // Support direct JSON colors payload
        if ($request->has('colors') && is_array($request->input('colors'))) {
            return $request->input('colors');
        }

        $colors = [];
        $colorNames = (array) $request->input('color_names', []);
        $colorHexes = (array) $request->input('color_hexes', []);
        $colorFiles = (array) $request->file('color_images', []);

        foreach ($colorNames as $i => $name) {
            if (empty($name) && empty($colorHexes[$i] ?? '')) {
                continue;
            }
            $entry = [
                'name' => (string) $name,
                'hex' => (string) ($colorHexes[$i] ?? '#000000'),
                'image' => null,
            ];
            if (! empty($colorFiles[$i])) {
                $entry['image'] = $this->imageOptimizer->storeAndOptimize(
                    $colorFiles[$i],
                    'cars/colors',
                    ['maxWidth' => 1200, 'quality' => 82]
                );
            }
            $colors[] = $entry;
        }

        return $colors ?: null;
    }
}
