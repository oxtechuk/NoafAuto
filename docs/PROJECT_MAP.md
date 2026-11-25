# Tameed — Project Map (AI context file)

> Read this first. It replaces exploring the repo from scratch. Keep it updated when structure changes.
> Last updated: 2026-11-24 (performance pass).

## 1. What this is

**Tameed** = car-financing/installment website for **Zad Capital (زاد كابيتال)**, Saudi Arabia. Arabic-first (RTL), English secondary.
It is also being grown into **Sitekit**, a reusable internal starter product (plan: `tamed.md`, progress: `docs/ROADMAP.md`).

One Laravel app serves **three surfaces**:

| Surface | URL | Tech | Auth |
|---|---|---|---|
| Public store (customers) | `/`, `/cars`, `/cars/{slug}`, ... | React SPA, Blade shell `resources/views/app.blade.php` with server-side SEO meta | none |
| New admin panel | `/admin/*` | React SPA, shell `resources/views/admin.blade.php` | Sanctum SPA cookie, guard `employee` |
| Legacy CRM (still the main back-office) | `/crm/*`, login `/manager-login` | Blade views `resources/views/crm/**` | session, guard `employee` |

The new React admin and the legacy Blade CRM **coexist**. Don't break either one.

## 2. Stack

- PHP 8.4, Laravel 13, Sanctum 4, Spatie Permission / Translatable / ActivityLog / Backup, Scramble (API docs), PHPUnit 12, Pint.
- React 19, React Router 7, TanStack Query 5, Zustand 5, i18next, Bootstrap 5 + Tailwind 4, TypeScript.
- Vite 8 (**Rolldown**, so use `build.rolldownOptions.output.codeSplitting`; object `manualChunks` breaks the build).
- MySQL in dev/prod. Tests use SQLite in-memory (`phpunit.xml`), so **MySQL-only SQL (`FIELD()`, `REGEXP_REPLACE`) breaks tests**.
- Cache/session/queue drivers = `database`.

## 3. Routing map

| File | Prefix / name | Purpose |
|---|---|---|
| `routes/web.php` | store pages → `StoreSpaController` (`store.*`); `/admin/{any?}` → admin SPA; `/crm/*` (`crm.*`, middleware `auth:employee, guard.employee, employee.active` + `permission:*` groups) | Web + CRM |
| `routes/api.php` | `/api/v1/*` (`api.v1.*`), uses `web` middleware + `auth:employee` | Admin SPA JSON API: auth, dashboard, reports, leads, bookings (+workflow actions), tasks, employees, roles, brands, cars, settings, modules, system/health, deploy-webhook |
| `routes/store-api.php` | mounted **twice** in `bootstrap/app.php`: `/api/v1/store/*` (`v1.store.api.*`) and legacy `/api/store/*` (`store.api.*`, marked deprecated) | Public store JSON: home, cars (list/meta/search/compare/show), brands, offers, blog, booking, calculator (+OTP), contact, newsletter, settings, faqs, gallery, seo-entry |
| `routes/console.php` | — | almost empty |

Throttles: `throttle:login`, `public-forms`, `otp`, `otp-verify`.

## 4. Backend layout (`app/`)

```
Http/Controllers/
  CRM/            40 Blade CRM controllers (one per resource: Booking, Lead, Car, Brand, Task, Employee, Role, settings sub-pages...)
  Api/V1/         admin JSON API (extends Api/ApiBaseController)
  Api/Store/      public store JSON API (thin, delegates to Services/Api/Store/*)
  Store/          StoreSpaController (renders SPA shell + SEO meta per page), SitemapController (sitemap.xml, llms.txt)
Http/Api/         custom response envelope: Contracts/ApiResponse, Response/Builder/ApiResponseBuilder (respondSuccess / respondPaginated),
                  Exceptions/Handlers/GlobalExceptionHandler
Http/Requests/    Api/V1/<Resource>/*Request, Api/Store/*
Http/Resources/   V1/* (admin API), Store/* (CarResource, CarMiniResource, ...)
Http/Middleware/  AssignRequestId, SecurityHeaders, Localization (web), ApiLocalization (Accept-Language), SetEmployeeGuard, EnsureEmployeeIsActive, MarkDeprecatedApi
Models/           40 models (see §5)
Observers/        18 observers, mostly cache invalidation for store content
Policies/         Booking, Brand, Car, Employee, Lead, Report, Role, Setting, Task
Services/
  Api/Store/      business logic for the store API (HomeApiService, CarApiService, CompareApiService, BookingApiService, CalculatorApiService...)
  Cache/          BaseCacheService + per-domain cache services (Home, Car, Offer, Blog, About, Booking, Calculator)
  Bookings/       BookingWorkflowService (status changes, supervisor approval), BookingFilterService
  Leads/ Tasks/   filter services
  Seo/            SeoContentBuilder, SeoEntryResolver, IndexNowService
  Modules/        ModuleManager (modules live in app/Modules/<Name>/module.json)
  Updates/ Health/ Sitekit update checker / upgrade runner / health check
  Tracking/       ConversionTrackingService (+ Jobs/SendConversionTrackingJob)
  root:           AttributionHelper, BookingAssignmentService, CalculatorService, ImageOptimizerService, TwilioOtpService, TwilioWhatsAppService
Jobs/             SendConversionTrackingJob, SendWhatsAppCampaignMessage
Console/Commands/ sitekit:* (health, updates, upgrade, version), seo import, indexnow, image optimize, make module, fix attributions
Providers/        AppServiceProvider, ApiResponseServiceProvider, SitekitModuleServiceProvider
```

**Where new code goes:** store endpoint → `Api/Store` controller + `Services/Api/Store/*Service` + `Resources/Store`. Admin endpoint → `Api/V1` controller + `Requests/Api/V1/<X>` + `Resources/V1` + Policy. Respond via `respondSuccess()` / `respondPaginated()`.

## 5. Domain model

- **Car**: translatable `name`, `slug`, `description`, `features` (JSON `{ar,en}`, so query with `name->ar`). Belongs to `Brand`, `CarCategory` (`category_id`), `CarModel`. Has `images` (CarImage), `offers` / `activeOffers`, `specifications`, `features_list`, `safety_features` (pivots). `specs` JSON (`hp`, `fuel`...). Indexed `horsepower` column, auto-synced from `specs.hp` in the `saving` hook (`Car::parseHorsepower`). `$appends = ['main_image']` is **required**: home API serializes raw Car models. `is_highlighted` is a string enum (`none`, `new_arrival`, `featured`, `trending`, `exclusive`). Old slugs → `CarSlugRedirect`.
- **Booking** (customer finance request): many statuses in `Booking::STATUSES` / `STATUS_GROUPS`. Active = `new, contacted_no_answer, recontact_client, waiting_documents, bank_review, approved, authorized, contacted, interested`. Completed = `received, sold, done`. Closed = `lost_*`, `rejected`. Closing requires supervisor approval (`waiting_supervisor_approval`) via `BookingWorkflowService`. `Booking::created` auto-creates/links a **Lead** by `client_phone`. Has notes (`BookingNote`), documents (`BookingDocument`, private storage), activity log.
- **Lead**: CRM contact, `contact_source_id` → `ContactSource`, `assigned_to` → Employee, has orders (bookings).
- **Task**: `assigned_to`, `created_by`, `due_date`, status `new|in_progress|done`, priority.
- **Employee** (back-office user, guard `employee`, Spatie roles/permissions on guard `employee`, `isAdmin()`). `User` model is basically unused.
- **Offer** (with `special_price`, `ends_at`, pivot `car_offer`), **Brand** / **BrandType**, **CarType**, **CarCategory**.
- Store CMS content: `HomeSection` (keyed by `key`), `HeroSlide`, `PromoBanner`, `PromoCard`, `FinanceStep`, `BudgetRange`, `Testimonial`, `Partner`, `Faq`, `BlogPost` / `BlogCategory`, `ProjectDesign`, `SeoEntry`, `Setting` (key/value).
- Calculator: `CalculatorBank`, `CalculatorFactor`, `CalculatorLead`. Also `NewsletterSubscriber`, `ModuleRegistry`, `UpdateHistory`.

## 6. Caching

- `BaseCacheService::remember()` = per-request runtime array + `Cache::remember`. TTL 1h default, 24h `TTL_LONG`.
- Big keys: `home.data` (everything on the homepage), `cars.filters` (facets), settings, hero slides.
- Observers in `app/Observers` call `forget*()` on model change. **When you add a cached query, add its invalidation to the observer.**

## 7. Frontend (`resources/react/`)

Entries (vite.config.js): `resources/react/main.tsx` (store), `resources/react/admin/main.tsx` (admin). Output `public/build` (gitignored).

**Store SPA**
```
main.tsx, i18n.ts, style.css
routes/index.tsx     React.lazy pages + Suspense skeletons
pages/               HomePage, AllCarsPage, CarDetailsPage, ComparePage, OffersPage, BlogsPage, BlogDetailsPage, AboutPage,
                     ContactPage, FinanceCalculatorPage, CarRequestPage, BrandsPage, BrandLandingPage, Terms, Privacy, NotFound, RootLayout
components/<feature>/  about, blogs, calculator, car-details, car-request, compare, contact-us, offers-page, skeletons, seo, footer-parts
services/api/        http.ts (axios + attribution injection) + <domain>.service.ts (calls /api/v1/store/*)
hooks/               page data hooks (React Query), useSeoEntry, useCarSearch...
store/               Zustand: language.store, settings.store
lib/query-client.ts  QueryClient (staleTime 5 min)
types/ interfaces/ constants/ utils/ helpers/ assets/
```

**Admin SPA** (`resources/react/admin/`)
```
main.tsx            own QueryClient (staleTime 5 min)
routes/AppRoutes.tsx  lazy pages under AdminLayout + RequireAuth (+ sub-module routes)
api/client.ts       axios, withCredentials + XSRF. A request interceptor prefixes '/api/v1' and de-duplicates it,
                    so both '/cars' and '/api/v1/cars' work
context/            AuthContext: useAuth() { user, loading, login, logout, can(permission), hasRole(role) }; BrandingContext (tenant branding)
pages/              Dashboard, Leads, Bookings (grouped: active/pending/delivered/closed), Tasks, Cars, CarFormPage, Employees,
                    Roles, Reports, Settings, Modules, Login + catalog/ clients/ content/ sales/ sub-pages
components/ui/      legacy admin UI (new code should use shared/)
```
**Shared UI** (`resources/react/shared/`), used by the admin:
```
components/ui/      Button, Badge, StatusBadge, Card, Input, Modal, DrawerModal, ConfirmDialog, EmptyState, Skeleton, StatCard,
                    Pagination (props: currentPage, lastPage, onPageChange)
components/crm/     CrudTableManager, ImageDropzone, ChecklistSelector, ColorVariantsBuilder
components/branding/TenantLogo
hooks/useDebouncedValue.ts   debounce search inputs (300ms) before they go into a React Query key
index.ts            barrel exports
```
Backend for these: `Api/V1/{Catalog,Client,Cms}SubModuleController`, `BrandingController`, models `Company` / `CompanyBranding`.
Admin API responses: `{ success, message, data, meta? }`; paginated `meta.{current_page,last_page,total,...}`. With axios: `res.data.data`.

`resources/js` + `resources/css` = old Vue/ERP leftovers (not in the Vite build).

## 8. Tests & tooling

- `tests/Feature/**` (API V1 per resource, store API, booking workflow, calculator, rate limiting, settings cache, sitekit ops). Factories: Booking, Brand, Car, ContactSource, Employee (`->admin()`), Lead, Task, User.
- Run: `php artisan test --compact --filter=X`. Needs `APP_KEY` (the local `.env` currently has none; tests can use `$env:APP_KEY=...` in PowerShell).
- Format: `vendor/bin/pint --dirty --format agent`. Type-check: `npx tsc --noEmit` (CarsPage was fixed; other old TS errors may exist).
- CI: `.github/workflows/ci.yml` (pint --test, tests, composer audit, npm build, npm audit). `deploy-instances.yml` = test + build, then broadcast deploy to all client instances (deploy webhook `/api/v1/system/deploy-webhook`).
- Local dev: WAMP (Apache + MySQL), not Herd. The local `.env` points at a DB `laravel` that doesn't exist. A benchmark DB `tameed_bench` may exist.

## 9. Gotchas (read before editing)

1. Store home API returns **raw models** for `featured_cars`, `offer_cars`, `highlighted_cars`, so model `$appends` / accessors are part of the API contract.
2. Translatable JSON columns: search with `where('name->ar', 'like', ...)`; set with `setTranslations()`.
3. Two auth worlds, one guard: CRM (Blade, session) and admin SPA (Sanctum cookie), both use guard `employee`. Permissions are checked with `permission:` middleware + Policies.
4. Store API exists at two prefixes. Test with route names (`store.api.*` or `v1.store.api.*`), not hard-coded URLs.
5. Keep SQL portable (tests run on SQLite). `CRM\DashboardController` uses `FIELD()`, so it is untestable on SQLite.
6. Dashboard stats (CRM + API) use one conditional-aggregation query per table. Keep it that way, don't go back to `clone()->count()` chains.
7. No `.vue` files are in the active build, but Vue/webpack/laravel-mix are still in `package.json` (removal pending approval).
8. Core version = `VERSION` file (not hard-coded). Releases are cut only from the upstream repo (`SITEKIT_ROLE=upstream` variable); client repos install them via `sitekit-update.yml`. Never edit core files inside a client repo: every edit becomes a merge conflict on the next update. Migrations must be additive (deploy.sh doesn't roll back the DB).
9. **Performance plumbing:** public store GETs send `Cache-Control: public` via the `cache.public:{seconds}` middleware (`CachePublicApiResponse`, Vary: Accept-Language). `cars.show` is deliberately excluded because it counts views. The store shell inlines `window.__BOOT_SETTINGS__` (= `settings/footer`) and the admin shell (`AdminSpaController`) inlines `window.__BOOT_USER__` (= `auth/me`), both used as initial data. Upload thumbnails: `/thumbs/{320|480|768}/{public-disk path}.webp`, generated on first hit by `ImageThumbnailService` into `public/thumbs` (disk `thumbs`, gitignored, safe to delete), then served statically; frontend `getThumbUrl` / `getThumbSrcSet` in `constants/app-images.ts`. Store Tailwind scans only store sources (`style.css` `source(none)`), admin only `admin/` + `shared/`. English translations are a lazy chunk (`ensureLanguageLoaded` in `i18n.ts`).
10. Arabic UI strings are inline in TSX/Blade. Translations: `lang/{ar,en}/{permissions,store-api}.php` + i18next resources for the store.

## 10. Don't read unless asked (large / irrelevant)

`tamed.md` (65 KB Sitekit plan), `Front/*.txt` (design notes), `zed_postman_collection.json`, `public/build/`, `vendor/`, `node_modules/`, `storage/`, `lang/vendor/`, `resources/reference*`.

## 11. Quick lookup

| Need | Go to |
|---|---|
| Homepage data | `Services/Api/Store/HomeApiService.php` + `Services/Cache/HomeCacheService.php` |
| Car list/filters (store) | `Services/Api/Store/CarApiService.php`, facets in `Services/Cache/CarCacheService.php` |
| Reports page (admin) | `Services/Reports/*`: `ReportRegistry` (sections, modules register theirs from their provider via `callAfterResolving`), `ReportSection` (KPIs + charts + tables as plain data, rendered generically), `ReportMetrics` (won/lost from `Booking::STATUSES` flags, win rate = won ÷ (won+lost), driver-specific month/day-diff SQL), `ReportFilters` (whereBetween on created_at), `ReportService` (10-min cache, previous-period compare). API `/api/v1/reports/sections[/{key}[/export]]`. Without `manage-reports` an employee gets only their own numbers. UI `admin/pages/ReportsPage.tsx` + `admin/components/reports/*` (SVG charts, no chart lib). Old `/reports/{bookings,sources,monthly}` kept for compatibility |
| Booking status logic | `Services/Bookings/BookingWorkflowService.php`, `Models/Booking.php` |
| Booking auto-assignment | `Services/BookingAssignmentService.php` |
| SEO meta for store pages | `Http/Controllers/Store/StoreSpaController.php`, `Services/Seo/*`, `resources/views/app.blade.php` |
| Permissions list | `database/seeders/PermissionSeeder.php`, `lang/*/permissions.php` |
| API envelope / errors | `app/Http/Api/**`, `bootstrap/app.php` |
| Admin page data fetching | `resources/react/admin/pages/<X>Page.tsx` (React Query, keys `['admin', '<resource>', {...}]`) |
| Store API calls | `resources/react/services/api/<domain>.service.ts` |
| AI assistant module (Gemini, per-showroom key) | `app/Modules/AiAssistant/**` (module.json, tools in `Tools/`, `Services/AssistantRunner`, `PromptBuilder`, `OutputGuard`), admin `admin/pages/AiAssistantPage.tsx`, storefront `sitekit-sdk/{assistant,useAssistant}.ts` + `components/assistant/*`, plan: `docs/AI_ASSISTANT_PLAN.md` |
| WhatsApp module (Meta Cloud API or Twilio) | `app/Modules/WhatsApp/**`: `Drivers/{MetaCloudDriver,TwilioDriver}`, `Services/{WhatsAppManager,InboundProcessor,WhatsAppSettings}`, webhooks `/api/v1/webhooks/whatsapp/{meta,twilio}`, AI auto-reply `Jobs/ReplyWithAssistant`. Inbox: conversations have `assigned_to` (auto round-robin / lead owner via `Services/ConversationAssigner`), `status` open|pending|closed, `tags`; non-admins only see/reach their own (`scopeVisibleTo`, 404 otherwise). Inbox page `admin/pages/WhatsAppConversationsPage.tsx` (`/admin/whatsapp/conversations`, settings page is admin-only): customer card + internal notes. Notes live in core `lead_notes` (`LeadNote`, API `/api/v1/leads/{lead}/notes`, shown on LeadsPage) so they survive disabling the module; WhatsApp writes them via `conversations/{id}/notes` (optional `message_id`) and `contacts/notes` (by phone), both creating the lead through `Services/LeadLinker` when missing (morph aliases `whatsapp_conversation|whatsapp_message`). Official channels only (no QR/Baileys). Meta onboarding: `Services/MetaOnboarding` = Embedded Signup with the platform's Meta app (`app/Modules/WhatsApp/config/whatsapp.php`, env `WHATSAPP_META_*`): code → business token, `subscribed_apps` with `override_callback_uri` = this showroom's webhook, number `register` (PIN kept as secret `meta.pin`); webhook signatures accept the showroom's or the platform app secret. Number health (`/health`, cached 10 min), templates mirrored in `wa_templates` (`Services/TemplateSync`, `/templates[/sync]`), Meta `pricing.{category,billable}` from status webhooks stored on `wa_messages` → report KPIs `billable` / `estimated_cost` (rates in settings `pricing.rates`, SAR). Settings `inbox.{auto_assign,hide_phone_from_sales,preset_tags}` (masked via `PhoneNumber::mask`). Enabling any module from `/admin/modules` runs its `database/migrations` (`ModuleManager::migrate`). Core contract `app/Contracts/WhatsAppGateway`: `TwilioWhatsAppService::sendWhatsApp($to, $text, $event, $vars)` delegates to it when connected, else legacy Twilio settings. Admin `admin/pages/WhatsAppPage.tsx` |
| External project storefront (e.g. noauf) | `config('sitekit.storefront')`, `Services/Storefront/StorefrontManager` (injects built `public/storefront/index.html` assets into `app.blade.php`), `sitekit:storefront:build`, frontend SDK in `<storefront>/src/sitekit-sdk/` (only `mappers.ts` is project-specific), guide: `docs/STOREFRONT_INTEGRATION.md` |
| Server connections: Redis / Cloudflare / CDN (admin only) | `Services/Infrastructure/*`: settings in `storage/app/private/sitekit/infrastructure.json` (secrets encrypted, not the settings table), applied per request by `InfrastructureServiceProvider` (first provider, register phase): Redis drivers only when a client exists and a TCP probe answers (else falls back to .env drivers), CDN = `app.asset_url`, Cloudflare = `TrustProxies::at(edge IPs)`. API `Api/V1/InfrastructureController` (`/api/v1/system/infrastructure/*`), UI `admin/pages/settings/InfrastructurePanel.tsx` (Settings tab "السيرفر") |
| Core updates (version, GitHub releases, install) | `VERSION`, `config/sitekit.php`, `Services/Updates/*`, `Api/V1/SystemUpdateController`, `admin/pages/UpdatesPage.tsx`, `.github/workflows/sitekit-{release,update}.yml`, `.github/sitekit/{deploy,report}.sh`, setup: `docs/SITEKIT_UPDATES_SETUP.md` |
