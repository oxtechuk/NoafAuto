<?php

use App\Http\Controllers\Api\V1\AuthController as V1AuthController;
use App\Http\Controllers\Api\V1\BookingController as V1BookingController;
use App\Http\Controllers\Api\V1\BrandController as V1BrandController;
use App\Http\Controllers\Api\V1\BrandingController as V1BrandingController;
use App\Http\Controllers\Api\V1\CarController as V1CarController;
use App\Http\Controllers\Api\V1\CatalogSubModuleController as V1CatalogController;
use App\Http\Controllers\Api\V1\ClientSubModuleController as V1ClientController;
use App\Http\Controllers\Api\V1\CmsSubModuleController as V1CmsController;
use App\Http\Controllers\Api\V1\DashboardController as V1DashboardController;
use App\Http\Controllers\Api\V1\DeployWebhookController;
use App\Http\Controllers\Api\V1\EmployeeController as V1EmployeeController;
use App\Http\Controllers\Api\V1\LeadController as V1LeadController;
use App\Http\Controllers\Api\V1\ModuleController as V1ModuleController;
use App\Http\Controllers\Api\V1\ReportController as V1ReportController;
use App\Http\Controllers\Api\V1\RoleController as V1RoleController;
use App\Http\Controllers\Api\V1\SettingController as V1SettingController;
use App\Http\Controllers\Api\V1\SystemController;
use App\Http\Controllers\Api\V1\TaskController as V1TaskController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->name('api.v1.')->group(function () {
    Route::get('/health', [SystemController::class, 'health'])->name('health');
    Route::get('/system/info', [SystemController::class, 'info'])->name('system.info');
    Route::get('/version', [SystemController::class, 'version'])->name('version');
    Route::post('/system/deploy-webhook', [DeployWebhookController::class, 'handle'])->name('system.deploy-webhook');

    // Cookie-based SPA authentication for employees (call /sanctum/csrf-cookie first).
    Route::prefix('auth')->name('auth.')->middleware('web')->group(function () {
        Route::post('/login', [V1AuthController::class, 'login'])->middleware('throttle:login')->name('login');

        Route::middleware(['auth:employee', 'employee.active'])->group(function () {
            Route::get('/me', [V1AuthController::class, 'me'])->name('me');
            Route::post('/logout', [V1AuthController::class, 'logout'])->name('logout');
        });
    });

    // Authenticated CRM API for employees (session cookie + CSRF).
    Route::middleware(['web', 'auth:employee', 'guard.employee', 'employee.active'])->group(function () {
        Route::get('dashboard/stats', [V1DashboardController::class, 'stats'])->name('dashboard.stats');
        Route::get('dashboard/alerts', [V1DashboardController::class, 'alerts'])->name('dashboard.alerts');

        Route::get('reports/bookings', [V1ReportController::class, 'bookings'])->name('reports.bookings');
        Route::get('reports/sources', [V1ReportController::class, 'sources'])->name('reports.sources');
        Route::get('reports/monthly', [V1ReportController::class, 'monthly'])->name('reports.monthly');

        // Client Sub-Modules (must precede leads apiResource)
        Route::get('leads/calculator', [V1ClientController::class, 'calculatorLeadsIndex'])->name('leads.calculator.index');
        Route::delete('leads/calculator/{lead}', [V1ClientController::class, 'calculatorLeadsDestroy'])->name('leads.calculator.destroy');

        Route::get('leads/sources', [V1ClientController::class, 'contactSourcesIndex'])->name('leads.sources.index');
        Route::post('leads/sources', [V1ClientController::class, 'contactSourcesStore'])->name('leads.sources.store');
        Route::put('leads/sources/{source}', [V1ClientController::class, 'contactSourcesUpdate'])->name('leads.sources.update');
        Route::delete('leads/sources/{source}', [V1ClientController::class, 'contactSourcesDestroy'])->name('leads.sources.destroy');

        Route::get('leads/newsletter', [V1ClientController::class, 'newsletterIndex'])->name('leads.newsletter.index');
        Route::delete('leads/newsletter/{subscriber}', [V1ClientController::class, 'newsletterDestroy'])->name('leads.newsletter.destroy');

        Route::apiResource('leads', V1LeadController::class)->whereNumber('lead');

        Route::apiResource('bookings', V1BookingController::class)->except('update');
        Route::prefix('bookings/{booking}')->name('bookings.')->controller(V1BookingController::class)->group(function () {
            Route::patch('/offer', 'updateOffer')->name('offer');
            Route::match(['patch', 'post'], '/status', 'updateStatus')->name('status');
            Route::post('/approve', 'approve')->name('approve');
            Route::post('/reject', 'reject')->name('reject');
            Route::match(['patch', 'post'], '/assign', 'assign')->name('assign');
            Route::match(['patch', 'post'], '/auto-assign', 'autoAssign')->name('auto-assign');
            Route::post('/notes', 'addNote')->name('notes.store');
            Route::post('/documents', 'uploadDocument')->name('documents.store');
            Route::get('/documents/{document}/download', 'downloadDocument')->name('documents.download');
            Route::delete('/documents/{document}', 'deleteDocument')->name('documents.destroy');
        });

        Route::apiResource('tasks', V1TaskController::class);
        Route::prefix('tasks/{task}')->name('tasks.')->controller(V1TaskController::class)->group(function () {
            Route::post('/toggle', 'toggle')->name('toggle');
            Route::post('/start', 'start')->name('start');
            Route::post('/complete', 'complete')->name('complete');
            Route::post('/postpone', 'postpone')->name('postpone');
        });

        Route::apiResource('employees', V1EmployeeController::class);
        Route::post('employees/{employee}/toggle-active', [V1EmployeeController::class, 'toggleActive'])->name('employees.toggle-active');

        Route::get('roles/permissions', [V1RoleController::class, 'permissions'])->name('roles.permissions');
        Route::post('roles/permissions', [V1RoleController::class, 'storePermission'])->name('roles.permissions.store');
        Route::apiResource('roles', V1RoleController::class);

        Route::get('brands/{brand}/models', [V1BrandController::class, 'models'])->name('brands.models');
        Route::apiResource('brands', V1BrandController::class);

        Route::get('cars/meta-options', [V1CarController::class, 'metaOptions'])->name('cars.meta-options');
        Route::delete('cars/images/{image}', [V1CarController::class, 'deleteImage'])->name('cars.images.delete');
        Route::apiResource('cars', V1CarController::class);

        // Catalog Sub-Modules
        Route::get('catalog/models', [V1CatalogController::class, 'modelsIndex'])->name('catalog.models.index');
        Route::post('catalog/models', [V1CatalogController::class, 'modelsStore'])->name('catalog.models.store');
        Route::put('catalog/models/{model}', [V1CatalogController::class, 'modelsUpdate'])->name('catalog.models.update');
        Route::delete('catalog/models/{model}', [V1CatalogController::class, 'modelsDestroy'])->name('catalog.models.destroy');

        Route::get('catalog/brand-types', [V1CatalogController::class, 'brandTypesIndex'])->name('catalog.brand-types.index');
        Route::post('catalog/brand-types', [V1CatalogController::class, 'brandTypesStore'])->name('catalog.brand-types.store');
        Route::put('catalog/brand-types/{brandType}', [V1CatalogController::class, 'brandTypesUpdate'])->name('catalog.brand-types.update');
        Route::delete('catalog/brand-types/{brandType}', [V1CatalogController::class, 'brandTypesDestroy'])->name('catalog.brand-types.destroy');

        Route::get('catalog/categories', [V1CatalogController::class, 'categoriesIndex'])->name('catalog.categories.index');
        Route::post('catalog/categories', [V1CatalogController::class, 'categoriesStore'])->name('catalog.categories.store');
        Route::put('catalog/categories/{category}', [V1CatalogController::class, 'categoriesUpdate'])->name('catalog.categories.update');
        Route::delete('catalog/categories/{category}', [V1CatalogController::class, 'categoriesDestroy'])->name('catalog.categories.destroy');

        Route::get('catalog/types', [V1CatalogController::class, 'carTypesIndex'])->name('catalog.types.index');
        Route::post('catalog/types', [V1CatalogController::class, 'carTypesStore'])->name('catalog.types.store');
        Route::put('catalog/types/{carType}', [V1CatalogController::class, 'carTypesUpdate'])->name('catalog.types.update');
        Route::delete('catalog/types/{carType}', [V1CatalogController::class, 'carTypesDestroy'])->name('catalog.types.destroy');

        Route::get('catalog/specs', [V1CatalogController::class, 'specsIndex'])->name('catalog.specs.index');
        Route::post('catalog/specs', [V1CatalogController::class, 'specsStore'])->name('catalog.specs.store');
        Route::put('catalog/specs/{spec}', [V1CatalogController::class, 'specsUpdate'])->name('catalog.specs.update');
        Route::delete('catalog/specs/{spec}', [V1CatalogController::class, 'specsDestroy'])->name('catalog.specs.destroy');

        Route::get('catalog/features', [V1CatalogController::class, 'featuresIndex'])->name('catalog.features.index');
        Route::post('catalog/features', [V1CatalogController::class, 'featuresStore'])->name('catalog.features.store');
        Route::put('catalog/features/{feature}', [V1CatalogController::class, 'featuresUpdate'])->name('catalog.features.update');
        Route::delete('catalog/features/{feature}', [V1CatalogController::class, 'featuresDestroy'])->name('catalog.features.destroy');

        Route::get('catalog/safety', [V1CatalogController::class, 'safetyIndex'])->name('catalog.safety.index');
        Route::post('catalog/safety', [V1CatalogController::class, 'safetyStore'])->name('catalog.safety.store');
        Route::put('catalog/safety/{safety}', [V1CatalogController::class, 'safetyUpdate'])->name('catalog.safety.update');
        Route::delete('catalog/safety/{safety}', [V1CatalogController::class, 'safetyDestroy'])->name('catalog.safety.destroy');

        Route::get('catalog/offers', [V1CatalogController::class, 'offersIndex'])->name('catalog.offers.index');
        Route::post('catalog/offers', [V1CatalogController::class, 'offersStore'])->name('catalog.offers.store');
        Route::put('catalog/offers/{offer}', [V1CatalogController::class, 'offersUpdate'])->name('catalog.offers.update');
        Route::delete('catalog/offers/{offer}', [V1CatalogController::class, 'offersDestroy'])->name('catalog.offers.destroy');

        // Sales Sub-Modules
        Route::get('sales/tracking', [V1ClientController::class, 'trackingIndex'])->name('sales.tracking.index');
        Route::patch('sales/tracking/{booking}/stage', [V1ClientController::class, 'trackingUpdateStage'])->name('sales.tracking.stage');

        Route::get('sales/calculator', [V1ClientController::class, 'calculatorSettingsShow'])->name('sales.calculator.show');
        Route::put('sales/calculator', [V1ClientController::class, 'calculatorSettingsUpdate'])->name('sales.calculator.update');

        // CMS Sub-Modules
        Route::get('content/blogs', [V1CmsController::class, 'blogsIndex'])->name('content.blogs.index');
        Route::post('content/blogs', [V1CmsController::class, 'blogsStore'])->name('content.blogs.store');
        Route::put('content/blogs/{post}', [V1CmsController::class, 'blogsUpdate'])->name('content.blogs.update');
        Route::delete('content/blogs/{post}', [V1CmsController::class, 'blogsDestroy'])->name('content.blogs.destroy');

        Route::get('content/blog-categories', [V1CmsController::class, 'blogCategoriesIndex'])->name('content.blog-categories.index');
        Route::post('content/blog-categories', [V1CmsController::class, 'blogCategoriesStore'])->name('content.blog-categories.store');
        Route::delete('content/blog-categories/{category}', [V1CmsController::class, 'blogCategoriesDestroy'])->name('content.blog-categories.destroy');

        Route::get('content/partners', [V1CmsController::class, 'partnersIndex'])->name('content.partners.index');
        Route::post('content/partners', [V1CmsController::class, 'partnersStore'])->name('content.partners.store');
        Route::delete('content/partners/{partner}', [V1CmsController::class, 'partnersDestroy'])->name('content.partners.destroy');

        Route::get('content/testimonials', [V1CmsController::class, 'testimonialsIndex'])->name('content.testimonials.index');
        Route::post('content/testimonials', [V1CmsController::class, 'testimonialsStore'])->name('content.testimonials.store');
        Route::delete('content/testimonials/{testimonial}', [V1CmsController::class, 'testimonialsDestroy'])->name('content.testimonials.destroy');

        Route::get('content/faqs', [V1CmsController::class, 'faqsIndex'])->name('content.faqs.index');
        Route::post('content/faqs', [V1CmsController::class, 'faqsStore'])->name('content.faqs.store');
        Route::delete('content/faqs/{faq}', [V1CmsController::class, 'faqsDestroy'])->name('content.faqs.destroy');

        Route::get('content/hero-slides', [V1CmsController::class, 'heroSlidesIndex'])->name('content.hero-slides.index');
        Route::post('content/hero-slides', [V1CmsController::class, 'heroSlidesStore'])->name('content.hero-slides.store');
        Route::delete('content/hero-slides/{slide}', [V1CmsController::class, 'heroSlidesDestroy'])->name('content.hero-slides.destroy');

        Route::get('content/promo-cards', [V1CmsController::class, 'promoCardsIndex'])->name('content.promo-cards.index');
        Route::get('content/promo-banners', [V1CmsController::class, 'promoBannersIndex'])->name('content.promo-banners.index');
        Route::get('content/finance-steps', [V1CmsController::class, 'financeStepsIndex'])->name('content.finance-steps.index');
        Route::get('content/budget-ranges', [V1CmsController::class, 'budgetRangesIndex'])->name('content.budget-ranges.index');
        Route::get('content/home-sections', [V1CmsController::class, 'homeSectionsIndex'])->name('content.home-sections.index');

        Route::get('settings', [V1SettingController::class, 'index'])->name('settings.index');
        Route::get('settings/{key}', [V1SettingController::class, 'show'])->name('settings.show');
        Route::put('settings', [V1SettingController::class, 'update'])->name('settings.update');
        Route::post('settings', [V1SettingController::class, 'update'])->name('settings.store');

        Route::get('modules', [V1ModuleController::class, 'index'])->name('modules.index');
        Route::post('modules/{key}/enable', [V1ModuleController::class, 'enable'])->name('modules.enable');
        Route::post('modules/{key}/disable', [V1ModuleController::class, 'disable'])->name('modules.disable');

        Route::get('branding', [V1BrandingController::class, 'show'])->name('branding.show');
    });
});

// Store Public API — loaded from routes/store-api.php
