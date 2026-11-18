<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Api\Contracts\ApiResponse;
use App\Http\Controllers\Api\ApiBaseController;
use App\Http\Requests\Api\V1\Cars\CarRequest;
use App\Http\Resources\V1\CarResource;
use App\Models\Car;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;

class CarController extends ApiBaseController
{
    private const RELATIONS = ['brand', 'category', 'carModel'];

    private const MAX_PER_PAGE = 100;

    public function index(Request $request): ApiResponse
    {
        Gate::authorize('viewAny', Car::class);

        $query = Car::query()->with(self::RELATIONS);

        if ($request->filled('brand_id')) {
            $query->where('brand_id', $request->input('brand_id'));
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->input('category_id'));
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

        $car = Car::create($data);

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

        $car->update($data);

        return $this->respondSuccess($this->carData($car), 'Car updated successfully');
    }

    public function destroy(Car $car): ApiResponse
    {
        Gate::authorize('delete', $car);

        $car->delete();

        return $this->respondDeleted('Car deleted successfully');
    }

    /**
     * @return array<string, mixed>
     */
    private function carData(Car $car): array
    {
        $car->load(self::RELATIONS);

        return (new CarResource($car))->resolve();
    }
}
