<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Api\Contracts\ApiResponse;
use App\Http\Api\Response\Builder\ApiResponseBuilder;
use App\Http\Controllers\Api\ApiBaseController;
use App\Http\Controllers\Api\Store\SettingsController;
use App\Models\BlogCategory;
use App\Models\BlogPost;
use App\Models\BudgetRange;
use App\Models\Faq;
use App\Models\FinanceStep;
use App\Models\HeroSlide;
use App\Models\HomeSection;
use App\Models\Partner;
use App\Models\PromoBanner;
use App\Models\PromoCard;
use App\Models\Testimonial;
use App\Services\ImageOptimizerService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class CmsSubModuleController extends ApiBaseController
{
    public function __construct(
        ApiResponseBuilder $responseBuilder,
        protected ImageOptimizerService $imageOptimizer
    ) {
        parent::__construct($responseBuilder);
    }

    // ==========================================
    // BLOG POSTS & CATEGORIES
    // ==========================================
    public function blogsIndex(Request $request): ApiResponse
    {
        $query = BlogPost::query()->with('categories');
        if ($request->filled('search')) {
            $s = trim((string) $request->input('search'));
            $query->where(function ($q) use ($s) {
                $q->where('title', 'like', "%{$s}%")
                    ->orWhere('meta_keywords', 'like', "%{$s}%");
            });
        }
        $posts = $query->latest()->paginate(20);
        $posts->getCollection()->transform(fn (BlogPost $post) => $this->formatBlogPost($post));

        return $this->respondPaginated($posts, 'Blog posts retrieved');
    }

    public function blogsStore(Request $request): ApiResponse
    {
        $data = $request->validate([
            'title' => 'required',
            'excerpt' => 'nullable',
            'content' => 'required',
            'category_ids' => 'nullable|array',
            'category_ids.*' => 'exists:blog_categories,id',
            'is_published' => 'boolean',
            'is_featured' => 'boolean',
            'tag' => 'nullable|string|max:100',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string|max:1000',
            'meta_keywords' => 'nullable|string|max:1000',
            'thumbnail' => 'nullable|image|max:5120',
            'image' => 'nullable|image|max:5120',
        ]);

        $categoryIds = $data['category_ids'] ?? [];
        unset($data['category_ids'], $data['image']);

        $titleVal = is_array($data['title']) ? ($data['title']['en'] ?? $data['title']['ar'] ?? 'post') : (string) $data['title'];
        $data['slug'] = Str::slug($titleVal.'-'.uniqid());
        $data['employee_id'] = $request->user('employee')?->id;

        if (! empty($data['is_published'])) {
            $data['published_at'] = now();
        }

        $file = $request->file('thumbnail') ?? $request->file('image');
        if ($file) {
            $data['thumbnail'] = $this->imageOptimizer->storeAndOptimize(
                $file,
                'blogs',
                ['maxWidth' => 1200, 'quality' => 82]
            );
        }

        $post = BlogPost::create($data);
        if (! empty($categoryIds)) {
            $post->categories()->sync($categoryIds);
        }
        $post->load('categories');

        return $this->respondCreated($this->formatBlogPost($post), 'Blog post created');
    }

    public function blogsUpdate(Request $request, BlogPost $post): ApiResponse
    {
        $data = $request->validate([
            'title' => 'sometimes',
            'excerpt' => 'nullable',
            'content' => 'sometimes',
            'category_ids' => 'nullable|array',
            'category_ids.*' => 'exists:blog_categories,id',
            'is_published' => 'boolean',
            'is_featured' => 'boolean',
            'tag' => 'nullable|string|max:100',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string|max:1000',
            'meta_keywords' => 'nullable|string|max:1000',
            'thumbnail' => 'nullable|image|max:5120',
            'image' => 'nullable|image|max:5120',
        ]);

        $hasCategories = array_key_exists('category_ids', $data);
        $categoryIds = $data['category_ids'] ?? [];
        unset($data['category_ids'], $data['image']);

        if (! empty($data['is_published']) && ! $post->published_at) {
            $data['published_at'] = now();
        }

        $file = $request->file('thumbnail') ?? $request->file('image');
        if ($file) {
            $data['thumbnail'] = $this->imageOptimizer->storeAndOptimize(
                $file,
                'blogs',
                ['maxWidth' => 1200, 'quality' => 82]
            );
        }

        $post->update($data);
        if ($hasCategories) {
            $post->categories()->sync($categoryIds);
        }
        $post->load('categories');

        return $this->respondSuccess($this->formatBlogPost($post), 'Blog post updated');
    }

    /**
     * @return array<string, mixed>
     */
    private function formatBlogPost(BlogPost $post): array
    {
        $arr = $post->toArray();
        $arr['title_translations'] = $post->getTranslations('title');
        $arr['excerpt_translations'] = $post->getTranslations('excerpt');
        $arr['content_translations'] = $post->getTranslations('content');
        $arr['category_ids'] = $post->categories->pluck('id')->values()->all();

        return $arr;
    }

    public function blogsDestroy(BlogPost $post): ApiResponse
    {
        $post->delete();

        return $this->respondSuccess(null, 'Blog post deleted');
    }

    public function blogCategoriesIndex(): ApiResponse
    {
        return $this->respondSuccess(BlogCategory::withCount('posts')->get(), 'Blog categories retrieved');
    }

    public function blogCategoriesStore(Request $request): ApiResponse
    {
        $data = $request->validate(['name' => 'required']);
        $nameVal = is_array($data['name']) ? ($data['name']['en'] ?? $data['name']['ar'] ?? 'cat') : (string) $data['name'];
        $data['slug'] = Str::slug($nameVal.'-'.uniqid());
        $cat = BlogCategory::create($data);

        return $this->respondCreated($cat, 'Blog category created');
    }

    public function blogCategoriesDestroy(BlogCategory $category): ApiResponse
    {
        $category->delete();

        return $this->respondSuccess(null, 'Blog category deleted');
    }

    // ==========================================
    // PARTNERS & TESTIMONIALS & FAQS
    // ==========================================
    public function partnersIndex(): ApiResponse
    {
        return $this->respondSuccess(Partner::orderBy('sort_order')->get(), 'Partners retrieved');
    }

    public function partnersStore(Request $request): ApiResponse
    {
        $data = $request->validate([
            'name' => 'required|string',
            'image' => 'required|image|max:5120',
            'link' => 'nullable|string',
            'sort_order' => 'nullable|integer',
        ]);

        if ($request->hasFile('image')) {
            $data['image'] = $this->imageOptimizer->storeAndOptimize(
                $request->file('image'),
                'partners',
                ['maxWidth' => 600, 'quality' => 85]
            );
        }

        $data['sort_order'] = (int) ($data['sort_order'] ?? 0);
        $partner = Partner::create($data);

        return $this->respondCreated($partner, 'Partner created');
    }

    public function partnersDestroy(Partner $partner): ApiResponse
    {
        $partner->delete();

        return $this->respondSuccess(null, 'Partner deleted');
    }

    public function testimonialsIndex(): ApiResponse
    {
        return $this->respondSuccess(Testimonial::orderBy('sort_order')->latest()->get(), 'Testimonials retrieved');
    }

    public function testimonialsStore(Request $request): ApiResponse
    {
        $data = $request->validate([
            'name' => 'required|string',
            'content' => 'required|string',
            'rating' => 'nullable|integer|min:1|max:5',
            'is_active' => 'boolean',
        ]);
        $data['sort_order'] = (int) ($data['sort_order'] ?? 0);
        $testimonial = Testimonial::create($data);

        return $this->respondCreated($testimonial, 'Testimonial created');
    }

    public function testimonialsDestroy(Testimonial $testimonial): ApiResponse
    {
        $testimonial->delete();

        return $this->respondSuccess(null, 'Testimonial deleted');
    }

    public function faqsIndex(): ApiResponse
    {
        return $this->respondSuccess(Faq::orderBy('sort_order')->get(), 'FAQs retrieved');
    }

    public function faqsStore(Request $request): ApiResponse
    {
        $data = $request->validate([
            'question' => 'required',
            'answer' => 'required',
            'is_active' => 'boolean',
        ]);
        $data['sort_order'] = (int) ($data['sort_order'] ?? 0);
        $faq = Faq::create($data);

        return $this->respondCreated($faq, 'FAQ created');
    }

    public function faqsDestroy(Faq $faq): ApiResponse
    {
        $faq->delete();

        return $this->respondSuccess(null, 'FAQ deleted');
    }

    // ==========================================
    // HERO SLIDES & PROMO
    // ==========================================
    public function heroSlidesIndex(): ApiResponse
    {
        return $this->respondSuccess(HeroSlide::orderBy('sort_order')->get(), 'Hero slides retrieved');
    }

    public function heroSlidesStore(Request $request): ApiResponse
    {
        $data = $request->validate([
            'title' => 'required',
            'subtitle' => 'nullable',
            'link' => 'nullable|string',
            'image' => 'required|image|max:8192',
            'sort_order' => 'nullable|integer',
            'is_active' => 'boolean',
        ]);

        if ($request->hasFile('image')) {
            $data['image'] = $this->imageOptimizer->storeAndOptimize(
                $request->file('image'),
                'slides',
                ['maxWidth' => 1920, 'quality' => 82]
            );
        }

        $data['sort_order'] = (int) ($data['sort_order'] ?? 0);
        $slide = HeroSlide::create($data);

        return $this->respondCreated($slide, 'Hero slide created');
    }

    public function heroSlidesDestroy(HeroSlide $slide): ApiResponse
    {
        $slide->delete();

        return $this->respondSuccess(null, 'Hero slide deleted');
    }

    public function promoCardsIndex(): ApiResponse
    {
        return $this->respondSuccess(PromoCard::orderBy('sort_order')->get(), 'Promo cards retrieved');
    }

    public function promoBannersIndex(): ApiResponse
    {
        return $this->respondSuccess(PromoBanner::orderBy('sort_order')->get(), 'Promo banners retrieved');
    }

    public function financeStepsIndex(): ApiResponse
    {
        return $this->respondSuccess(FinanceStep::orderBy('step_number')->get(), 'Finance steps retrieved');
    }

    public function budgetRangesIndex(): ApiResponse
    {
        return $this->respondSuccess(BudgetRange::orderBy('sort_order')->get(), 'Budget ranges retrieved');
    }

    public function homeSectionsIndex(): ApiResponse
    {
        return $this->respondSuccess(HomeSection::all(), 'Home sections retrieved');
    }

    // ==========================================
    // LEGAL PAGES (PRIVACY POLICY & TERMS)
    // ==========================================
    public function legalPagesIndex(): ApiResponse
    {
        $privacySetting = Setting::where('key', 'page_privacy_policy')->first();
        $termsSetting = Setting::where('key', 'page_terms_conditions')->first();

        $privacy = $privacySetting?->value ?: SettingsController::defaultLegalData('privacy');
        $terms = $termsSetting?->value ?: SettingsController::defaultLegalData('terms');

        return $this->respondSuccess([
            'privacy' => [
                'slug' => 'privacy',
                'key' => 'page_privacy_policy',
                'title' => $privacy['title'] ?? ['ar' => 'سياسة الخصوصية', 'en' => 'Privacy Policy'],
                'content' => $privacy['content'] ?? ['ar' => '', 'en' => ''],
                'updated_at' => $privacy['updated_at'] ?? $privacySetting?->updated_at?->toISOString() ?? now()->toISOString(),
            ],
            'terms' => [
                'slug' => 'terms',
                'key' => 'page_terms_conditions',
                'title' => $terms['title'] ?? ['ar' => 'الشروط والأحكام', 'en' => 'Terms & Conditions'],
                'content' => $terms['content'] ?? ['ar' => '', 'en' => ''],
                'updated_at' => $terms['updated_at'] ?? $termsSetting?->updated_at?->toISOString() ?? now()->toISOString(),
            ],
        ], 'Legal pages retrieved');
    }

    public function legalPagesShow(string $slug): ApiResponse
    {
        $normalized = match (str_replace('_', '-', strtolower($slug))) {
            'terms', 'terms-conditions', 'terms-and-conditions', 'terms-of-service' => 'terms',
            default => 'privacy',
        };

        $key = $normalized === 'terms' ? 'page_terms_conditions' : 'page_privacy_policy';
        $setting = Setting::where('key', $key)->first();
        $data = $setting?->value;

        if (! is_array($data) || empty($data['content'])) {
            $data = SettingsController::defaultLegalData($normalized);
        }

        return $this->respondSuccess([
            'slug' => $normalized,
            'key' => $key,
            'title' => $data['title'] ?? ($normalized === 'terms' ? ['ar' => 'الشروط والأحكام', 'en' => 'Terms & Conditions'] : ['ar' => 'سياسة الخصوصية', 'en' => 'Privacy Policy']),
            'content' => $data['content'] ?? ['ar' => '', 'en' => ''],
            'updated_at' => $data['updated_at'] ?? $setting?->updated_at?->toISOString() ?? now()->toISOString(),
        ], 'Legal page retrieved');
    }

    public function legalPagesUpdate(Request $request, string $slug): ApiResponse
    {
        $normalized = match (str_replace('_', '-', strtolower($slug))) {
            'terms', 'terms-conditions', 'terms-and-conditions', 'terms-of-service' => 'terms',
            default => 'privacy',
        };

        $key = $normalized === 'terms' ? 'page_terms_conditions' : 'page_privacy_policy';

        $data = $request->validate([
            'title' => 'required',
            'content' => 'required',
        ]);

        $title = is_array($data['title']) ? $data['title'] : ['ar' => $data['title'], 'en' => $data['title']];
        $content = is_array($data['content']) ? $data['content'] : ['ar' => $data['content'], 'en' => $data['content']];

        $payload = [
            'title' => $title,
            'content' => $content,
            'updated_at' => now()->toISOString(),
        ];

        Setting::updateOrCreate(['key' => $key], ['value' => $payload]);

        Cache::forget('store.legal.'.$normalized);
        Cache::forget('store.legal.privacy');
        Cache::forget('store.legal.terms');

        return $this->respondSuccess([
            'slug' => $normalized,
            'key' => $key,
            'title' => $title,
            'content' => $content,
            'updated_at' => $payload['updated_at'],
        ], 'Legal page updated successfully');
    }
}
