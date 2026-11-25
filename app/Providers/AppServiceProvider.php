<?php

namespace App\Providers;

use App\Models\BlogPost;
use App\Models\Brand;
use App\Models\BudgetRange;
use App\Models\CalculatorBank;
use App\Models\CalculatorFactor;
use App\Models\Car;
use App\Models\CarCategory;
use App\Models\Feature;
use App\Models\FinanceStep;
use App\Models\HeroSlide;
use App\Models\HomeSection;
use App\Models\Offer;
use App\Models\Partner;
use App\Models\PromoCard;
use App\Models\Setting;
use App\Models\Specification;
use App\Models\Testimonial;
use App\Observers\BlogPostObserver;
use App\Observers\BrandObserver;
use App\Observers\BudgetRangeObserver;
use App\Observers\CalculatorBankObserver;
use App\Observers\CalculatorFactorObserver;
use App\Observers\CarCategoryObserver;
use App\Observers\CarObserver;
use App\Observers\FeatureObserver;
use App\Observers\FinanceStepObserver;
use App\Observers\HeroSlideObserver;
use App\Observers\HomeSectionObserver;
use App\Observers\OfferObserver;
use App\Observers\PartnerObserver;
use App\Observers\PromoCardObserver;
use App\Observers\SettingObserver;
use App\Observers\SpecificationObserver;
use App\Observers\TestimonialObserver;
use App\Policies\RolePolicy;
use App\Services\Cache\BaseCacheService;
use App\Services\Reports\ReportRegistry;
use App\Services\Storefront\StorefrontManager;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Contracts\View\View as ViewContract;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\View;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;
use Throwable;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Modules add their report sections to it from their own providers.
        $this->app->singleton(ReportRegistry::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        View::composer('*', function (ViewContract $view): void {
            $view->with('globalSettings', $this->globalSettings());
        });

        // Project storefront (resources/storefront) replaces the bundled store SPA when built + enabled.
        View::composer('app', function (ViewContract $view): void {
            $view->with('storefront', app(StorefrontManager::class)->viewData());
        });

        $this->configureLazyLoadingPrevention();

        $this->configureRateLimiting();

        $this->registerObservers();

        Gate::policy(Role::class, RolePolicy::class);
        Gate::define('viewApiDocs', fn ($user = null) => app()->environment('local', 'testing') || (bool) $user?->hasRole('super-admin'));

        // Fix for MySQL older versions (index key length)
        Schema::defaultStringLength(191);

        // Force HTTPS if APP_URL starts with https
        if (str_contains(config('app.url'), 'https')) {
            URL::forceScheme('https');
        }
    }

    /**
     * Resolve the cached settings only when a view is actually rendered,
     * so API requests and console commands never pay for this lookup.
     */
    private function globalSettings(): mixed
    {
        try {
            return app(BaseCacheService::class)->rememberSettings();
        } catch (Throwable) {
            return [];
        }
    }

    /**
     * Surface N+1 queries outside production: fail tests, log locally.
     */
    private function configureLazyLoadingPrevention(): void
    {
        Model::preventLazyLoading(! $this->app->isProduction());

        if (! $this->app->runningUnitTests()) {
            Model::handleLazyLoadingViolationUsing(function (Model $model, string $relation): void {
                Log::warning('Lazy loading violation', [
                    'model' => $model::class,
                    'relation' => $relation,
                ]);
            });
        }
    }

    /**
     * Protect authentication, paid SMS and public forms from abuse.
     */
    private function configureRateLimiting(): void
    {
        RateLimiter::for('api', function (Request $request): Limit {
            return Limit::perMinute(120)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('login', function (Request $request): Limit {
            return Limit::perMinute(5)->by(Str::lower((string) $request->input('username')).'|'.$request->ip());
        });

        RateLimiter::for('otp', function (Request $request): array {
            return [
                Limit::perMinute(3)->by('otp-ip:'.$request->ip()),
                Limit::perHour(10)->by('otp-ip-hour:'.$request->ip()),
                Limit::perHour(5)->by('otp-phone:'.preg_replace('/\D+/', '', (string) $request->input('phone'))),
            ];
        });

        RateLimiter::for('otp-verify', function (Request $request): Limit {
            return Limit::perMinute(5)->by(preg_replace('/\D+/', '', (string) $request->input('phone')).'|'.$request->ip());
        });

        RateLimiter::for('public-forms', function (Request $request): Limit {
            return Limit::perMinute(10)->by($request->ip());
        });
    }

    private function registerObservers(): void
    {
        Car::observe(CarObserver::class);
        Brand::observe(BrandObserver::class);
        BlogPost::observe(BlogPostObserver::class);
        Setting::observe(SettingObserver::class);
        Offer::observe(OfferObserver::class);
        CarCategory::observe(CarCategoryObserver::class);
        Feature::observe(FeatureObserver::class);
        Specification::observe(SpecificationObserver::class);
        Testimonial::observe(TestimonialObserver::class);
        Partner::observe(PartnerObserver::class);
        CalculatorBank::observe(CalculatorBankObserver::class);
        CalculatorFactor::observe(CalculatorFactorObserver::class);
        HomeSection::observe(HomeSectionObserver::class);
        HeroSlide::observe(HeroSlideObserver::class);
        PromoCard::observe(PromoCardObserver::class);
        FinanceStep::observe(FinanceStepObserver::class);
        BudgetRange::observe(BudgetRangeObserver::class);
    }
}
