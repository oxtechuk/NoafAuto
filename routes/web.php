<?php

use App\Http\Controllers\AdminSpaController;
use App\Http\Controllers\LanguageController;
use App\Http\Controllers\Store\SitemapController;
// =============================================
//  Language Switcher & SEO
// =============================================
use Illuminate\Support\Facades\Route;

Route::get('/lang/{lang}', [LanguageController::class, 'switchLang'])->name('lang.switch');
Route::get('/sitemap.xml', [SitemapController::class, 'index'])->name('sitemap');
Route::get('/llms.txt', [SitemapController::class, 'llms'])->name('llms');

use App\Http\Controllers\Store\StoreSpaController;

// =============================================
//  React Single Page Application (SPA) with Server-Side Meta & HTTP 404
// =============================================
Route::get('/', [StoreSpaController::class, 'home'])->name('store.home');
Route::get('/cars', [StoreSpaController::class, 'cars'])->name('store.cars');

Route::get('/cars-catalog', function () {
    return redirect()->route('store.cars');
})->name('store.cars.index');

Route::get('/cars/{slug}', [StoreSpaController::class, 'car'])->name('store.cars.show');
Route::get('/offers', [StoreSpaController::class, 'offers'])->name('store.offers');
Route::get('/about', [StoreSpaController::class, 'about'])->name('store.about');
Route::get('/contact', [StoreSpaController::class, 'contact'])->name('store.contact');
Route::get('/blog', [StoreSpaController::class, 'blogIndex'])->name('store.blog');
Route::get('/blog/{slug}', [StoreSpaController::class, 'blogShow'])->name('store.blog.show');
Route::get('/finance-calculator', [StoreSpaController::class, 'financeCalculator'])->name('store.finance-calculator');
Route::get('/request-car', [StoreSpaController::class, 'requestCar'])->name('store.request-car');
Route::get('/brands', [StoreSpaController::class, 'brands'])->name('store.brands');
Route::get('/brands/{brandSlug}', [StoreSpaController::class, 'brand'])->name('store.brands.show');
Route::get('/compare', [StoreSpaController::class, 'compare'])->name('store.compare');
Route::get('/terms', [StoreSpaController::class, 'terms'])->name('store.terms');
Route::get('/privacy', [StoreSpaController::class, 'privacy'])->name('store.privacy');

Route::get('/admin/{any?}', AdminSpaController::class)->where('any', '.*')->name('admin.spa');

Route::redirect('/login', '/admin/login')->name('login');

Route::get('/{any}', [StoreSpaController::class, 'fallback'])
    ->where('any', '^(?!crm|admin|login|docs|manager-login|api|store-api|storage|thumbs/).*$');

// =============================================
//  CRM (Admin Dashboard)
// =============================================
use App\Http\Controllers\CRM\AuthController;
use App\Http\Controllers\CRM\BlogCategoryController;
use App\Http\Controllers\CRM\BlogController;
use App\Http\Controllers\CRM\BookingController;
use App\Http\Controllers\CRM\BrandController;
use App\Http\Controllers\CRM\BrandTypeController;
use App\Http\Controllers\CRM\BudgetRangeController;
use App\Http\Controllers\CRM\CalculatorLeadController;
use App\Http\Controllers\CRM\CalculatorSettingsController;
use App\Http\Controllers\CRM\CarCategoryController;
use App\Http\Controllers\CRM\CarController;
use App\Http\Controllers\CRM\CarModelController;
use App\Http\Controllers\CRM\CarTypeController;
use App\Http\Controllers\CRM\ContactSourceController;
use App\Http\Controllers\CRM\EmployeeController;
use App\Http\Controllers\CRM\FaqController;
use App\Http\Controllers\CRM\FeatureController;
use App\Http\Controllers\CRM\FinanceStepController;
use App\Http\Controllers\CRM\GeneralSettingController;
use App\Http\Controllers\CRM\HeroSlideController;
use App\Http\Controllers\CRM\HomeSectionController;
use App\Http\Controllers\CRM\LeadController;
use App\Http\Controllers\CRM\NewsletterSubscriberController;
use App\Http\Controllers\CRM\NotificationController;
use App\Http\Controllers\CRM\OfferController;
use App\Http\Controllers\CRM\PartnerController;
use App\Http\Controllers\CRM\ProfileController;
use App\Http\Controllers\CRM\ProjectDesignController;
use App\Http\Controllers\CRM\PromoBannerController;
use App\Http\Controllers\CRM\PromoCardController;
use App\Http\Controllers\CRM\RoleController;
use App\Http\Controllers\CRM\SafetyFeatureController;
use App\Http\Controllers\CRM\SearchController;
use App\Http\Controllers\CRM\SpecificationController;
use App\Http\Controllers\CRM\TestimonialController;
use App\Http\Controllers\CRM\TranslationController;

// Unique Secure Login
Route::get('/manager-login', [AuthController::class, 'showLoginForm'])->name('crm.login');
Route::post('/manager-login', [AuthController::class, 'login'])->middleware('throttle:login')->name('crm.login.post');

Route::prefix('crm')->name('crm.')->middleware(['auth:employee', 'guard.employee', 'employee.active'])->group(function () {

    // === Open routes (accessible to all authenticated employees) ===
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
    Route::get('/dashboard', fn () => redirect('/admin'))->name('dashboard');
    Route::get('/global-search', [SearchController::class, 'globalSearch'])->name('global-search');
    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead'])->name('notifications.read');
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead'])->name('notifications.read-all');
    Route::get('/profile', fn () => redirect('/admin/profile'))->name('profile.index');
    Route::put('/profile', [ProfileController::class, 'update'])->name('profile.update');

    // === تتبع الحالات (Kanban) ===
    Route::middleware('permission:manage-tracking')->group(function () {
        Route::get('tracking', fn () => redirect('/admin/sales/tracking'))->name('tracking.index');
    });

    // === السيارات (تحويل تلقائي إلى لوحة التحكم الحديثة /admin/cars) ===
    Route::middleware('permission:manage-cars')->group(function () {
        Route::get('cars', fn () => redirect('/admin/cars'))->name('cars.index');
        Route::get('cars/create', fn () => redirect('/admin/cars/create'))->name('cars.create');
        Route::get('cars/{id}/edit', fn ($id) => redirect("/admin/cars/{$id}/edit"))->name('cars.edit');
        Route::resource('cars', CarController::class)->except(['index', 'create', 'edit']);
        Route::get('cars/images/{image}/delete', [CarController::class, 'deleteImage'])->name('cars.delete-image');
    });

    // === المواصفات والمميزات ===
    Route::middleware('permission:manage-specifications|manage-cars')->group(function () {
        Route::get('specifications', fn () => redirect('/admin/catalog/specs'))->name('specifications.index');
        Route::resource('specifications', SpecificationController::class)->except(['index']);
    });
    Route::middleware('permission:manage-features|manage-cars')->group(function () {
        Route::get('features', fn () => redirect('/admin/catalog/features'))->name('features.index');
        Route::resource('features', FeatureController::class)->except(['index']);
    });
    Route::middleware('permission:manage-safety-features|manage-cars')->group(function () {
        Route::get('safety-features', fn () => redirect('/admin/catalog/safety'))->name('safety-features.index');
        Route::resource('safety-features', SafetyFeatureController::class)->except(['index']);
    });

    // === الماركات والموديلات ===
    Route::middleware('permission:manage-brands|manage-cars')->group(function () {
        Route::get('brands', fn () => redirect('/admin/catalog/brands'))->name('brands.index');
        Route::post('brands', [BrandController::class, 'store'])->name('brands.store');
        Route::put('brands/{brand}', [BrandController::class, 'update'])->name('brands.update');
        Route::delete('brands/{brand}', [BrandController::class, 'destroy'])->name('brands.destroy');

        Route::get('brands/{brand}/models', [CarModelController::class, 'getModelsByBrand'])->name('brands.models');
        Route::get('car-models', fn () => redirect('/admin/catalog/models'))->name('car-models.index');
        Route::resource('car-models', CarModelController::class)->except(['create', 'show', 'edit', 'index']);
    });

    // === أنواع الماركات ===
    Route::middleware('permission:manage-brand-types')->group(function () {
        Route::get('brand-types', fn () => redirect('/admin/catalog/brand-types'))->name('brand-types.index');
        Route::post('brand-types', [BrandTypeController::class, 'store'])->name('brand-types.store');
        Route::put('brand-types/{brandType}', [BrandTypeController::class, 'update'])->name('brand-types.update');
        Route::delete('brand-types/{brandType}', [BrandTypeController::class, 'destroy'])->name('brand-types.destroy');
    });

    // === تصنيفات السيارات ===
    Route::middleware('permission:manage-car-categories')->group(function () {
        Route::get('car-categories', fn () => redirect('/admin/catalog/categories'))->name('car-categories.index');
        Route::post('car-categories', [CarCategoryController::class, 'store'])->name('car-categories.store');
        Route::put('car-categories/{carCategory}', [CarCategoryController::class, 'update'])->name('car-categories.update');
        Route::delete('car-categories/{carCategory}', [CarCategoryController::class, 'destroy'])->name('car-categories.destroy');
    });

    // === أنواع السيارات ===
    Route::middleware('permission:manage-car-types')->group(function () {
        Route::get('car-types', fn () => redirect('/admin/catalog/types'))->name('car-types.index');
        Route::post('car-types', [CarTypeController::class, 'store'])->name('car-types.store');
        Route::put('car-types/{carType}', [CarTypeController::class, 'update'])->name('car-types.update');
        Route::delete('car-types/{carType}', [CarTypeController::class, 'destroy'])->name('car-types.destroy');
    });

    // === العملاء المحتملون + مصادر التواصل ===
    Route::middleware('permission:manage-leads')->group(function () {
        Route::get('leads', fn () => redirect('/admin/sales/leads'))->name('leads.index');
        Route::resource('leads', LeadController::class)->except(['index']);
        Route::post('leads/whatsapp-campaign', [LeadController::class, 'whatsappCampaign'])->name('leads.whatsapp-campaign');
    });
    Route::middleware('permission:manage-contact-sources')->group(function () {
        Route::get('contact-sources', fn () => redirect('/admin/settings?tab=contact-sources'))->name('contact-sources.index');
        Route::post('contact-sources', [ContactSourceController::class, 'store'])->name('contact-sources.store');
        Route::put('contact-sources/{contactSource}', [ContactSourceController::class, 'update'])->name('contact-sources.update');
        Route::delete('contact-sources/{contactSource}', [ContactSourceController::class, 'destroy'])->name('contact-sources.destroy');
    });

    // === تقارير منصة الحجز ===
    Route::middleware('permission:manage-reports')->group(function () {
        Route::get('reports/bookings', fn () => redirect('/admin/reports/bookings'))->name('reports.bookings');
        Route::get('reports/sources', fn () => redirect('/admin/reports/sources'))->name('reports.sources');
        Route::get('reports/monthly', fn () => redirect('/admin/reports/monthly'))->name('reports.monthly');
    });

    // === حاسبة التقسيط (إعدادات) ===
    Route::middleware('permission:manage-calculator-settings')->group(function () {
        Route::get('calculator', fn () => redirect('/admin/settings?tab=calculator'))->name('calculator.index');
        Route::post('calculator/banks', [CalculatorSettingsController::class, 'storeBank'])->name('calculator.banks.store');
        Route::put('calculator/banks/{calculatorBank}', [CalculatorSettingsController::class, 'updateBank'])->name('calculator.banks.update');
        Route::delete('calculator/banks/{calculatorBank}', [CalculatorSettingsController::class, 'destroyBank'])->name('calculator.banks.destroy');
        Route::post('calculator/factors', [CalculatorSettingsController::class, 'storeFactor'])->name('calculator.factors.store');
        Route::put('calculator/factors/{calculatorFactor}', [CalculatorSettingsController::class, 'updateFactor'])->name('calculator.factors.update');
        Route::delete('calculator/factors/{calculatorFactor}', [CalculatorSettingsController::class, 'destroyFactor'])->name('calculator.factors.destroy');
    });

    // === عملاء الحاسبة ===
    Route::middleware('permission:manage-calculator-leads')->group(function () {
        Route::get('calculator-leads', fn () => redirect('/admin/sales/leads'))->name('calculator-leads.index');
        Route::delete('calculator-leads/{calculatorLead}', [CalculatorLeadController::class, 'destroy'])->name('calculator-leads.destroy');
    });

    // === الطلبات (Bookings) ===
    Route::middleware('permission:manage-bookings')->group(function () {
        Route::get('bookings', fn () => redirect('/admin/bookings'))->name('bookings.index');
        Route::get('bookings/active', fn () => redirect('/admin/bookings'))->name('bookings.active');
        Route::get('bookings/pending', fn () => redirect('/admin/sales/bookings/pending'))->name('bookings.pending');
        Route::get('bookings/delivered', fn () => redirect('/admin/sales/bookings/delivered'))->name('bookings.delivered');
        Route::get('bookings/completed', fn () => redirect('/admin/sales/bookings/delivered'))->name('bookings.completed');
        Route::get('bookings/closed', fn () => redirect('/admin/sales/bookings/closed'))->name('bookings.closed');
        Route::get('bookings/new', fn () => redirect('/admin/bookings?status=new'))->name('bookings.new');
        Route::get('bookings/inprogress', fn () => redirect('/admin/bookings'))->name('bookings.inprogress');
        Route::post('bookings', [BookingController::class, 'store'])->name('bookings.store');
        Route::get('bookings/{booking}', [BookingController::class, 'show'])->name('bookings.show');
        Route::patch('bookings/{booking}/status', [BookingController::class, 'updateStatus'])->name('bookings.status');
        Route::patch('bookings/{booking}/approve', [BookingController::class, 'approveStatus'])->name('bookings.approve');
        Route::patch('bookings/{booking}/reject', [BookingController::class, 'rejectStatus'])->name('bookings.reject');
        Route::patch('bookings/{booking}/assign', [BookingController::class, 'assign'])->name('bookings.assign');
        Route::patch('bookings/{booking}/offer', [BookingController::class, 'updateOffer'])->name('bookings.offer');
        Route::post('bookings/{booking}/note', [BookingController::class, 'addNote'])->name('bookings.note');
        Route::post('bookings/{booking}/documents', [BookingController::class, 'uploadDocument'])->name('bookings.documents.store');
        Route::delete('booking-documents/{document}', [BookingController::class, 'deleteDocument'])->name('bookings.documents.destroy');
        Route::delete('bookings/{booking}', [BookingController::class, 'destroy'])->name('bookings.destroy');
    });

    // === الموظفين ===
    Route::middleware('permission:manage-employees')->group(function () {
        Route::get('employees', fn () => redirect('/admin/system/employees'))->name('employees.index');
        Route::post('employees', [EmployeeController::class, 'store'])->name('employees.store');
        Route::put('employees/{employee}', [EmployeeController::class, 'update'])->name('employees.update');
        Route::delete('employees/{employee}', [EmployeeController::class, 'destroy'])->name('employees.destroy');
    });

    // === الصلاحيات والأدوار ===
    Route::middleware('permission:manage-roles')->group(function () {
        Route::get('roles', fn () => redirect('/admin/system/roles'))->name('roles.index');
        Route::resource('roles', RoleController::class)->except(['index']);
    });

    // === العروض ===
    Route::middleware('permission:manage-offers')->group(function () {
        Route::get('offers', fn () => redirect('/admin/cms/offers'))->name('offers.index');
        Route::post('offers', [OfferController::class, 'store'])->name('offers.store');
        Route::put('offers/{offer}', [OfferController::class, 'update'])->name('offers.update');
        Route::delete('offers/{offer}', [OfferController::class, 'destroy'])->name('offers.destroy');
    });

    // === المدونة ===
    Route::middleware('permission:manage-blog')->group(function () {
        Route::get('blog', fn () => redirect('/admin/cms/blog'))->name('blog.index');
        Route::get('blog/create', fn () => redirect('/admin/cms/blog'))->name('blog.create');
        Route::post('blog', [BlogController::class, 'store'])->name('blog.store');
        Route::get('blog/{blog}/edit', fn () => redirect('/admin/cms/blog'))->name('blog.edit');
        Route::put('blog/{blog}', [BlogController::class, 'update'])->name('blog.update');
        Route::delete('blog/{blog}', [BlogController::class, 'destroy'])->name('blog.destroy');
        Route::post('blog/{blog}/toggle-featured', [BlogController::class, 'toggleFeatured'])->name('blog.toggle-featured');

        // Blog Categories
        Route::get('blog-categories', fn () => redirect('/admin/cms/blog-categories'))->name('blog-categories.index');
        Route::post('blog-categories', [BlogCategoryController::class, 'store'])->name('blog-categories.store');
        Route::put('blog-categories/{blogCategory}', [BlogCategoryController::class, 'update'])->name('blog-categories.update');
        Route::delete('blog-categories/{blogCategory}', [BlogCategoryController::class, 'destroy'])->name('blog-categories.destroy');
    });

    // === إدارة الترجمة ===
    Route::middleware('permission:manage-translations')->group(function () {
        Route::get('translations', fn () => redirect('/admin/settings?tab=translations'))->name('translations.index');
        Route::post('translations', [TranslationController::class, 'update'])->name('translations.update');
    });

    // === الإعدادات ===
    Route::prefix('settings')->name('settings.')->group(function () {
        Route::middleware('permission:manage-settings')->group(function () {
            Route::get('general', fn () => redirect('/admin/settings'))->name('general');
            Route::get('seo', fn () => redirect('/admin/settings?tab=integrations'))->name('seo');
            Route::post('update', [GeneralSettingController::class, 'update'])->name('update');
        });
        Route::middleware('permission:manage-settings-integrations')->group(function () {
            Route::get('integrations', fn () => redirect('/admin/settings?tab=integrations'))->name('integrations');
        });

        // الأسئلة الشائعة
        Route::middleware('permission:manage-faqs')->group(function () {
            Route::get('faqs', fn () => redirect('/admin/cms/faqs'))->name('faqs.index');
            Route::post('faqs', [FaqController::class, 'store'])->name('faqs.store');
            Route::put('faqs/{faq}', [FaqController::class, 'update'])->name('faqs.update');
            Route::delete('faqs/{faq}', [FaqController::class, 'destroy'])->name('faqs.destroy');
        });

        // التوصيات
        Route::middleware('permission:manage-testimonials')->group(function () {
            Route::get('testimonials', fn () => redirect('/admin/cms/testimonials'))->name('testimonials.index');
            Route::resource('testimonials', TestimonialController::class)->except(['index']);
        });

        // الشركاء
        Route::middleware('permission:manage-partners')->group(function () {
            Route::get('partners', fn () => redirect('/admin/cms/partners'))->name('partners.index');
            Route::resource('partners', PartnerController::class)->except(['index']);
        });

        // الصفحة الرئيسية (Home CMS)
        Route::middleware('permission:manage-home-sections')->group(function () {
            Route::get('home-sections', fn () => redirect('/admin/settings?tab=home-sections'))->name('home-sections.index');
            Route::put('home-sections/{homeSection}', [HomeSectionController::class, 'update'])->name('home-sections.update');
        });
        Route::middleware('permission:manage-hero-slides')->group(function () {
            Route::get('hero-slides', fn () => redirect('/admin/settings?tab=hero-slides'))->name('hero-slides.index');
            Route::resource('hero-slides', HeroSlideController::class)->except(['index', 'create', 'show', 'edit']);
        });
        Route::middleware('permission:manage-promo-cards')->group(function () {
            Route::get('promo-cards', fn () => redirect('/admin/settings?tab=promo-cards'))->name('promo-cards.index');
            Route::resource('promo-cards', PromoCardController::class)->except(['index', 'create', 'show', 'edit']);
        });
        Route::middleware('permission:manage-promo-banners')->group(function () {
            Route::get('promo-banners', fn () => redirect('/admin/settings?tab=promo-banners'))->name('promo-banners.index');
            Route::resource('promo-banners', PromoBannerController::class)->except(['index', 'create', 'show', 'edit']);
        });
        Route::middleware('permission:manage-finance-steps')->group(function () {
            Route::get('finance-steps', fn () => redirect('/admin/settings?tab=finance-steps'))->name('finance-steps.index');
            Route::resource('finance-steps', FinanceStepController::class)->except(['index', 'create', 'show', 'edit']);
        });
        Route::middleware('permission:manage-budget-ranges')->group(function () {
            Route::get('budget-ranges', fn () => redirect('/admin/settings?tab=budget-ranges'))->name('budget-ranges.index');
            Route::resource('budget-ranges', BudgetRangeController::class)->except(['index', 'create', 'show', 'edit']);
        });

        // التصميمات
        Route::middleware('permission:manage-designs')->group(function () {
            Route::get('designs', fn () => redirect('/admin/settings?tab=designs'))->name('designs.index');
            Route::resource('designs', ProjectDesignController::class)->except(['index']);
            Route::post('designs/{projectDesign}/toggle-featured', [ProjectDesignController::class, 'toggleFeatured'])->name('designs.toggle-featured');
        });
    });

    // === المشتركون في النشرة الإخبارية ===
    Route::middleware('permission:manage-newsletter')->group(function () {
        Route::get('newsletter-subscribers', fn () => redirect('/admin/marketing/newsletter'))->name('newsletter.index');
        Route::delete('newsletter-subscribers/{subscriber}', [NewsletterSubscriberController::class, 'destroy'])->name('newsletter.destroy');
        Route::patch('newsletter-subscribers/{subscriber}/toggle', [NewsletterSubscriberController::class, 'toggle'])->name('newsletter.toggle');
        Route::get('newsletter-subscribers/export', [NewsletterSubscriberController::class, 'export'])->name('newsletter.export');
    });
});

// =============================================
//  Redirects & Fallback
// =============================================
// إعادة توجيه /erp إلى /crm لأي روابط قديمة
Route::get('/erp/{any?}', function () {
    return redirect('/gr-manager-login', 301);
})->where('any', '.*');

// Storage direct fallback (ensures public media is accessible even if symlink is missing on server)
Route::get('/storage/{path}', function (string $path) {
    $filePath = storage_path('app/public/'.$path);
    if (! file_exists($filePath)) {
        abort(404);
    }

    return response()->file($filePath);
})->where('path', '.*')->name('storage.fallback');

// Fallback 404
Route::fallback(function () {
    abort(404);
});
