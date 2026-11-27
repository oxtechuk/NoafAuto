<?php

use App\Http\Controllers\Api\Store\AboutController;
use App\Http\Controllers\Api\Store\BlogController;
use App\Http\Controllers\Api\Store\BookingController;
use App\Http\Controllers\Api\Store\CalculatorController;
use App\Http\Controllers\Api\Store\CarCategoryController;
use App\Http\Controllers\Api\Store\CarController;
use App\Http\Controllers\Api\Store\CarTypeController;
use App\Http\Controllers\Api\Store\ContactController;
use App\Http\Controllers\Api\Store\FaqController;
use App\Http\Controllers\Api\Store\GalleryController;
use App\Http\Controllers\Api\Store\HomeController;
use App\Http\Controllers\Api\Store\NewsletterController;
use App\Http\Controllers\Api\Store\OfferController;
use App\Http\Controllers\Api\Store\PartnerController;
use App\Http\Controllers\Api\Store\SeoEntryController;
use App\Http\Controllers\Api\Store\SettingsController;
use App\Http\Controllers\Api\Store\TestimonialController;
use Illuminate\Support\Facades\Route;

Route::prefix('store')->name('store.api.')->group(function () {
    // Car Catalog (US1)
    Route::get('/cars', [CarController::class, 'index'])->middleware('cache.public:60')->name('cars.index');
    Route::get('/cars/meta', [CarController::class, 'listMeta'])->middleware('cache.public:300')->name('cars.meta');
    Route::get('/cars/search', [CarController::class, 'search'])->middleware('cache.public:60')->name('cars.search');
    Route::get('/cars/compare', [CarController::class, 'compare'])->middleware('cache.public:60')->name('cars.compare');
    Route::get('/cars/{slug}', [CarController::class, 'show'])->name('cars.show');
    Route::get('/cars/{slug}/articles', [BlogController::class, 'forCar'])->middleware('cache.public:300')->name('cars.articles');
    Route::get('/brands', [CarController::class, 'brands'])->middleware('cache.public:300')->name('brands.index');
    Route::get('/brands/{brand}/models', [CarController::class, 'brandModels'])->middleware('cache.public:300')->name('brands.models');
    Route::get('/car-categories', [CarCategoryController::class, 'index'])->middleware('cache.public:300')->name('car-categories.index');
    Route::get('/car-types', [CarTypeController::class, 'index'])->middleware('cache.public:300')->name('car-types.index');

    // SEO copy per page (title, extra text, FAQ)
    Route::get('/seo-entry', [SeoEntryController::class, 'show'])->middleware('cache.public:300')->name('seo-entry.show');

    // Booking & Calculator (US2)
    Route::get('/booking/meta', [BookingController::class, 'meta'])->middleware('cache.public:300')->name('booking.meta');
    Route::post('/booking', [BookingController::class, 'store'])->middleware('throttle:public-forms')->name('booking.store');
    Route::post('/bookings', [BookingController::class, 'store'])->middleware('throttle:public-forms')->name('bookings.store');
    Route::get('/calculator/banks', [CalculatorController::class, 'banks'])->middleware('cache.public:300')->name('calculator.banks');
    Route::post('/calculator/calculate', [CalculatorController::class, 'calculate'])->name('calculator.calculate');
    Route::post('/calculator/lead', [CalculatorController::class, 'saveLead'])->middleware('throttle:public-forms')->name('calculator.lead');
    Route::post('/calculator/otp/send', [CalculatorController::class, 'sendOtp'])->middleware('throttle:otp')->name('calculator.otp.send');
    Route::post('/calculator/otp/verify', [CalculatorController::class, 'verifyOtp'])->middleware('throttle:otp-verify')->name('calculator.otp.verify');

    // Content & Engagement (US3)
    Route::get('/blog', [BlogController::class, 'index'])->middleware('cache.public:300')->name('blog.index');
    Route::get('/blog/categories', [BlogController::class, 'categories'])->middleware('cache.public:300')->name('blog.categories');
    Route::get('/blog/{slug}', [BlogController::class, 'show'])->middleware('cache.public:300')->name('blog.show');
    Route::get('/offers', [OfferController::class, 'index'])->middleware('cache.public:60')->name('offers.index');
    Route::post('/newsletter', [NewsletterController::class, 'store'])->middleware('throttle:public-forms')->name('newsletter.store');

    // FAQs
    Route::get('/faqs', FaqController::class)->middleware('cache.public:300')->name('faqs');

    // Home & Static (US4)
    Route::get('/home', [HomeController::class, '__invoke'])->middleware('cache.public:60')->name('home');
    Route::get('/about', [AboutController::class, '__invoke'])->middleware('cache.public:300')->name('about');
    Route::post('/contact', [ContactController::class, 'store'])->middleware('throttle:public-forms')->name('contact.store');
    Route::get('/testimonials', [TestimonialController::class, '__invoke'])->middleware('cache.public:300')->name('testimonials');
    Route::get('/partners', [PartnerController::class, '__invoke'])->middleware('cache.public:300')->name('partners');

    // Settings & Gallery (US5)
    Route::get('/legal/{slug}', [SettingsController::class, 'legalPage'])->middleware('cache.public:60')->name('legal.show');
    Route::get('/settings', [SettingsController::class, 'index'])->middleware('cache.public:300')->name('settings.index');
    Route::get('/settings/footer', [SettingsController::class, 'footer'])->middleware('cache.public:300')->name('settings.footer');
    Route::get('/settings/finance-solution', [SettingsController::class, 'getFinanceSolution'])->middleware('cache.public:300')->name('settings.finance-solution');
    Route::get('/gallery', [GalleryController::class, '__invoke'])->middleware('cache.public:300')->name('gallery');
});
