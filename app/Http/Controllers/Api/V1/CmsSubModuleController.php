<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Api\Contracts\ApiResponse;
use App\Http\Api\Response\Builder\ApiResponseBuilder;
use App\Http\Controllers\Api\ApiBaseController;
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
        $query = BlogPost::query()->with('category');
        if ($request->filled('search')) {
            $s = trim((string) $request->input('search'));
            $query->where('title', 'like', "%{$s}%");
        }
        $posts = $query->latest()->paginate(20);

        return $this->respondPaginated($posts, 'Blog posts retrieved');
    }

    public function blogsStore(Request $request): ApiResponse
    {
        $data = $request->validate([
            'title' => 'required',
            'content' => 'required',
            'category_id' => 'nullable|exists:blog_categories,id',
            'is_published' => 'boolean',
            'image' => 'nullable|image|max:5120',
        ]);

        $titleVal = is_array($data['title']) ? ($data['title']['en'] ?? $data['title']['ar'] ?? 'post') : (string) $data['title'];
        $data['slug'] = Str::slug($titleVal.'-'.uniqid());

        if ($request->hasFile('image')) {
            $data['image'] = $this->imageOptimizer->storeAndOptimize(
                $request->file('image'),
                'blogs',
                ['maxWidth' => 1200, 'quality' => 82]
            );
        }

        $post = BlogPost::create($data);

        return $this->respondCreated($post, 'Blog post created');
    }

    public function blogsUpdate(Request $request, BlogPost $post): ApiResponse
    {
        $data = $request->validate([
            'title' => 'sometimes',
            'content' => 'sometimes',
            'category_id' => 'nullable|exists:blog_categories,id',
            'is_published' => 'boolean',
            'image' => 'nullable|image|max:5120',
        ]);

        if ($request->hasFile('image')) {
            $data['image'] = $this->imageOptimizer->storeAndOptimize(
                $request->file('image'),
                'blogs',
                ['maxWidth' => 1200, 'quality' => 82]
            );
        }

        $post->update($data);

        return $this->respondSuccess($post, 'Blog post updated');
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
}
