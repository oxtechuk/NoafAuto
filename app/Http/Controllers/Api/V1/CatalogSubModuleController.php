<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Api\Contracts\ApiResponse;
use App\Http\Api\Response\Builder\ApiResponseBuilder;
use App\Http\Controllers\Api\ApiBaseController;
use App\Models\Brand;
use App\Models\BrandType;
use App\Models\CarCategory;
use App\Models\CarModel;
use App\Models\CarType;
use App\Models\Feature;
use App\Models\Offer;
use App\Models\SafetyFeature;
use App\Models\Specification;
use App\Services\ImageOptimizerService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CatalogSubModuleController extends ApiBaseController
{
    public function __construct(
        ApiResponseBuilder $responseBuilder,
        protected ImageOptimizerService $imageOptimizer
    ) {
        parent::__construct($responseBuilder);
    }

    // ==========================================
    // CAR MODELS
    // ==========================================
    public function modelsIndex(Request $request): ApiResponse
    {
        $query = CarModel::query()->with('brand')->withCount('cars');

        if ($request->filled('brand_id')) {
            $query->where('brand_id', $request->input('brand_id'));
        }
        if ($request->filled('search')) {
            $s = trim((string) $request->input('search'));
            $query->where('name', 'like', "%{$s}%");
        }

        $models = $query->latest()->paginate(20);

        return $this->respondPaginated($models, 'Car models retrieved');
    }

    public function modelsStore(Request $request): ApiResponse
    {
        $data = $request->validate([
            'brand_id' => 'required|exists:brands,id',
            'name' => 'required',
            'is_active' => 'boolean',
        ]);
        $data['is_active'] = $request->boolean('is_active', true);
        $model = CarModel::create($data);

        return $this->respondCreated($model->load('brand'), 'Car model created');
    }

    public function modelsUpdate(Request $request, CarModel $model): ApiResponse
    {
        $data = $request->validate([
            'brand_id' => 'sometimes|exists:brands,id',
            'name' => 'sometimes',
            'is_active' => 'boolean',
        ]);
        if ($request->has('is_active')) {
            $data['is_active'] = $request->boolean('is_active');
        }
        $model->update($data);

        return $this->respondSuccess($model->load('brand'), 'Car model updated');
    }

    public function modelsDestroy(CarModel $model): ApiResponse
    {
        if ($model->cars()->exists()) {
            return $this->respondError('لا يمكن حذف الموديل: مرتبط بسيارات مسجلة', 422);
        }
        $model->delete();

        return $this->respondSuccess(null, 'Car model deleted');
    }

    // ==========================================
    // BRAND TYPES
    // ==========================================
    public function brandTypesIndex(Request $request): ApiResponse
    {
        $query = BrandType::query()->withCount('brands');
        if ($request->filled('search')) {
            $s = trim((string) $request->input('search'));
            $query->where('name', 'like', "%{$s}%");
        }
        $types = $query->orderBy('sort_order')->latest()->paginate(20);

        return $this->respondPaginated($types, 'Brand types retrieved');
    }

    public function brandTypesStore(Request $request): ApiResponse
    {
        $data = $request->validate([
            'name' => 'required',
            'sort_order' => 'nullable|integer',
            'is_active' => 'boolean',
        ]);
        $nameVal = is_array($data['name']) ? ($data['name']['en'] ?? $data['name']['ar'] ?? 'type') : (string) $data['name'];
        $data['slug'] = Str::slug($nameVal.'-'.uniqid());
        $data['is_active'] = $request->boolean('is_active', true);
        $data['sort_order'] = (int) ($data['sort_order'] ?? 0);
        $type = BrandType::create($data);

        return $this->respondCreated($type, 'Brand type created');
    }

    public function brandTypesUpdate(Request $request, BrandType $brandType): ApiResponse
    {
        $data = $request->validate([
            'name' => 'sometimes',
            'sort_order' => 'nullable|integer',
            'is_active' => 'boolean',
        ]);
        if ($request->has('is_active')) {
            $data['is_active'] = $request->boolean('is_active');
        }
        if (array_key_exists('sort_order', $data)) {
            $data['sort_order'] = (int) ($data['sort_order'] ?? 0);
        }
        $brandType->update($data);

        return $this->respondSuccess($brandType, 'Brand type updated');
    }

    public function brandTypesDestroy(BrandType $brandType): ApiResponse
    {
        if ($brandType->brands()->exists()) {
            return $this->respondError('لا يمكن حذف نوع الماركة: مرتبط بماركات مسجلة', 422);
        }
        $brandType->delete();

        return $this->respondSuccess(null, 'Brand type deleted');
    }

    // ==========================================
    // CAR CATEGORIES
    // ==========================================
    public function categoriesIndex(Request $request): ApiResponse
    {
        $query = CarCategory::query()->withCount('cars');
        if ($request->filled('search')) {
            $s = trim((string) $request->input('search'));
            $query->where('name', 'like', "%{$s}%");
        }
        $categories = $query->orderBy('sort_order')->latest()->paginate(20);

        return $this->respondPaginated($categories, 'Categories retrieved');
    }

    public function categoriesStore(Request $request): ApiResponse
    {
        $data = $request->validate([
            'name' => 'required',
            'sort_order' => 'nullable|integer',
            'is_active' => 'boolean',
        ]);
        $nameVal = is_array($data['name']) ? ($data['name']['en'] ?? $data['name']['ar'] ?? 'cat') : (string) $data['name'];
        $data['slug'] = Str::slug($nameVal.'-'.uniqid());
        $data['is_active'] = $request->boolean('is_active', true);
        $data['sort_order'] = (int) ($data['sort_order'] ?? 0);
        $category = CarCategory::create($data);

        return $this->respondCreated($category, 'Category created');
    }

    public function categoriesUpdate(Request $request, CarCategory $category): ApiResponse
    {
        $data = $request->validate([
            'name' => 'sometimes',
            'sort_order' => 'nullable|integer',
            'is_active' => 'boolean',
        ]);
        if ($request->has('is_active')) {
            $data['is_active'] = $request->boolean('is_active');
        }
        if (array_key_exists('sort_order', $data)) {
            $data['sort_order'] = (int) ($data['sort_order'] ?? 0);
        }
        $category->update($data);

        return $this->respondSuccess($category, 'Category updated');
    }

    public function categoriesDestroy(CarCategory $category): ApiResponse
    {
        if ($category->cars()->exists()) {
            return $this->respondError('لا يمكن حذف التصنيف: مرتبط بسيارات مسجلة', 422);
        }
        $category->delete();

        return $this->respondSuccess(null, 'Category deleted');
    }

    // ==========================================
    // CAR TYPES
    // ==========================================
    public function carTypesIndex(Request $request): ApiResponse
    {
        $query = CarType::query();
        if ($request->filled('search')) {
            $s = trim((string) $request->input('search'));
            $query->where('name', 'like', "%{$s}%");
        }
        $types = $query->orderBy('sort_order')->latest()->paginate(20);

        return $this->respondPaginated($types, 'Car types retrieved');
    }

    public function carTypesStore(Request $request): ApiResponse
    {
        $data = $request->validate([
            'name' => 'required',
            'sort_order' => 'nullable|integer',
            'is_active' => 'boolean',
        ]);
        $nameVal = is_array($data['name']) ? ($data['name']['en'] ?? $data['name']['ar'] ?? 'type') : (string) $data['name'];
        $data['slug'] = Str::slug($nameVal.'-'.uniqid());
        $data['is_active'] = $request->boolean('is_active', true);
        $data['sort_order'] = (int) ($data['sort_order'] ?? 0);
        $type = CarType::create($data);

        return $this->respondCreated($type, 'Car type created');
    }

    public function carTypesUpdate(Request $request, CarType $carType): ApiResponse
    {
        $data = $request->validate([
            'name' => 'sometimes',
            'sort_order' => 'nullable|integer',
            'is_active' => 'boolean',
        ]);
        if ($request->has('is_active')) {
            $data['is_active'] = $request->boolean('is_active');
        }
        if (array_key_exists('sort_order', $data)) {
            $data['sort_order'] = (int) ($data['sort_order'] ?? 0);
        }
        $carType->update($data);

        return $this->respondSuccess($carType, 'Car type updated');
    }

    public function carTypesDestroy(CarType $carType): ApiResponse
    {
        $carType->delete();

        return $this->respondSuccess(null, 'Car type deleted');
    }

    // ==========================================
    // SPECIFICATIONS, FEATURES, SAFETY
    // ==========================================
    public function specsIndex(): ApiResponse
    {
        return $this->respondSuccess(Specification::latest()->get(), 'Specifications retrieved');
    }

    public function specsStore(Request $request): ApiResponse
    {
        $data = $request->validate([
            'name' => 'required',
            'icon' => 'nullable|string',
        ]);
        $spec = Specification::create($data);

        return $this->respondCreated($spec, 'Specification created');
    }

    public function specsUpdate(Request $request, Specification $spec): ApiResponse
    {
        $data = $request->validate([
            'name' => 'sometimes',
            'icon' => 'nullable|string',
        ]);
        $spec->update($data);

        return $this->respondSuccess($spec, 'Specification updated');
    }

    public function specsDestroy(Specification $spec): ApiResponse
    {
        $spec->delete();

        return $this->respondSuccess(null, 'Specification deleted');
    }

    public function featuresIndex(): ApiResponse
    {
        return $this->respondSuccess(Feature::latest()->get(), 'Features retrieved');
    }

    public function featuresStore(Request $request): ApiResponse
    {
        $data = $request->validate([
            'name' => 'required',
            'icon' => 'nullable|string',
        ]);
        $feature = Feature::create($data);

        return $this->respondCreated($feature, 'Feature created');
    }

    public function featuresUpdate(Request $request, Feature $feature): ApiResponse
    {
        $data = $request->validate([
            'name' => 'sometimes',
            'icon' => 'nullable|string',
        ]);
        $feature->update($data);

        return $this->respondSuccess($feature, 'Feature updated');
    }

    public function featuresDestroy(Feature $feature): ApiResponse
    {
        $feature->delete();

        return $this->respondSuccess(null, 'Feature deleted');
    }

    public function safetyIndex(): ApiResponse
    {
        return $this->respondSuccess(SafetyFeature::latest()->get(), 'Safety features retrieved');
    }

    public function safetyStore(Request $request): ApiResponse
    {
        $data = $request->validate([
            'name' => 'required',
            'icon' => 'nullable|string',
        ]);
        $safety = SafetyFeature::create($data);

        return $this->respondCreated($safety, 'Safety feature created');
    }

    public function safetyUpdate(Request $request, SafetyFeature $safety): ApiResponse
    {
        $data = $request->validate([
            'name' => 'sometimes',
            'icon' => 'nullable|string',
        ]);
        $safety->update($data);

        return $this->respondSuccess($safety, 'Safety feature updated');
    }

    public function safetyDestroy(SafetyFeature $safety): ApiResponse
    {
        $safety->delete();

        return $this->respondSuccess(null, 'Safety feature deleted');
    }

    // ==========================================
    // OFFERS
    // ==========================================
    public function offersIndex(Request $request): ApiResponse
    {
        $query = Offer::query()->with('car');
        if ($request->filled('search')) {
            $s = trim((string) $request->input('search'));
            $query->where('title', 'like', "%{$s}%");
        }
        $offers = $query->latest()->paginate(20);

        return $this->respondPaginated($offers, 'Offers retrieved');
    }

    public function offersStore(Request $request): ApiResponse
    {
        $data = $request->validate([
            'title' => 'required',
            'description' => 'nullable',
            'tag' => 'nullable|string|in:popular,exclusive,new,limited',
            'discount_percent' => 'nullable|numeric|min:0|max:100',
            'special_price' => 'nullable|numeric|min:0',
            'special_installment' => 'nullable|numeric|min:0',
            'starts_at' => 'nullable|date',
            'ends_at' => 'nullable|date',
            'is_active' => 'boolean',
            'car_id' => 'nullable|exists:cars,id',
            'image' => 'nullable|image|max:5120',
        ]);

        if ($request->hasFile('image')) {
            $data['image'] = $this->imageOptimizer->storeAndOptimize(
                $request->file('image'),
                'offers',
                ['maxWidth' => 1200, 'quality' => 82]
            );
        }

        $offer = Offer::create($data);

        return $this->respondCreated($offer, 'Offer created');
    }

    public function offersUpdate(Request $request, Offer $offer): ApiResponse
    {
        $data = $request->validate([
            'title' => 'sometimes',
            'description' => 'nullable',
            'tag' => 'nullable|string|in:popular,exclusive,new,limited',
            'discount_percent' => 'nullable|numeric|min:0|max:100',
            'special_price' => 'nullable|numeric|min:0',
            'special_installment' => 'nullable|numeric|min:0',
            'starts_at' => 'nullable|date',
            'ends_at' => 'nullable|date',
            'is_active' => 'boolean',
            'car_id' => 'nullable|exists:cars,id',
            'image' => 'nullable|image|max:5120',
        ]);

        if ($request->hasFile('image')) {
            $data['image'] = $this->imageOptimizer->storeAndOptimize(
                $request->file('image'),
                'offers',
                ['maxWidth' => 1200, 'quality' => 82]
            );
        }

        $offer->update($data);

        return $this->respondSuccess($offer, 'Offer updated');
    }

    public function offersDestroy(Offer $offer): ApiResponse
    {
        $offer->delete();

        return $this->respondSuccess(null, 'Offer deleted');
    }
}
