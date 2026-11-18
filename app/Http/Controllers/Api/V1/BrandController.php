<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Api\Contracts\ApiResponse;
use App\Http\Controllers\Api\ApiBaseController;
use App\Http\Requests\Api\V1\Brands\BrandRequest;
use App\Http\Resources\V1\BrandResource;
use App\Models\Brand;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;

class BrandController extends ApiBaseController
{
    private const RELATIONS = ['brandType'];

    private const MAX_PER_PAGE = 100;

    public function index(Request $request): ApiResponse
    {
        Gate::authorize('viewAny', Brand::class);

        $query = Brand::query()->with(self::RELATIONS)->withCount('cars');

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->filled('brand_type_id')) {
            $query->where('brand_type_id', $request->input('brand_type_id'));
        }

        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        if ($request->boolean('all')) {
            $brands = $query->orderBy('name')->get();

            return $this->respondSuccess(
                BrandResource::collection($brands)->resolve(),
                'Brands retrieved successfully'
            );
        }

        $perPage = min(max((int) $request->integer('per_page', 20), 1), self::MAX_PER_PAGE);
        $brands = $query->latest()->paginate($perPage)->withQueryString();
        $brands->setCollection(collect(BrandResource::collection($brands->getCollection())->resolve()));

        return $this->respondPaginated($brands, 'Brands retrieved successfully');
    }

    public function store(BrandRequest $request): ApiResponse
    {
        Gate::authorize('create', Brand::class);

        $data = $request->validated();
        $nameEn = $data['name']['en'] ?? $data['name']['ar'];
        $data['slug'] = Str::slug($nameEn) ?: 'brand-'.Str::random(6);

        $brand = Brand::create($data);

        return $this->respondCreated($this->brandData($brand), 'Brand created successfully');
    }

    public function show(Brand $brand): ApiResponse
    {
        Gate::authorize('view', $brand);

        return $this->respondSuccess($this->brandData($brand));
    }

    public function update(BrandRequest $request, Brand $brand): ApiResponse
    {
        Gate::authorize('update', $brand);

        $data = $request->validated();
        if (isset($data['name']['en']) && ! empty($data['name']['en'])) {
            $data['slug'] = Str::slug($data['name']['en']);
        }

        $brand->update($data);

        return $this->respondSuccess($this->brandData($brand), 'Brand updated successfully');
    }

    public function destroy(Brand $brand): ApiResponse
    {
        Gate::authorize('delete', $brand);

        $brand->delete();

        return $this->respondDeleted('Brand deleted successfully');
    }

    /**
     * @return array<string, mixed>
     */
    private function brandData(Brand $brand): array
    {
        $brand->load(self::RELATIONS)->loadCount('cars');

        return (new BrandResource($brand))->resolve();
    }
}
