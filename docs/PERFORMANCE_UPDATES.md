# تقرير تحسينات الأداء — Tameed

> التاريخ: 2026-11-24 · الفرع: **`Master`** · commits: `1c` و`docs: performance report`
> المرجع: خطة `tameed-performance-optimization-prompt.md`

---

## 1. الملخص

| البند | قبل | بعد |
|---|---|---|
| فلتر الحصان في المتجر | بيحمّل كل السيارات النشطة في PHP ويفلترها في الذاكرة | `WHERE` على عمود `horsepower` عليه index |
| إحصائيات داشبورد الـ CRM (`/crm/dashboard`) | 6 queries للإحصائيات | **query واحد** |
| إحصائيات داشبورد الأدمن (`/api/v1/dashboard/stats`) | كانت متحسّنة أصلاً على `Master` (3 queries) | زي ما هي |
| JS اللي بيتحمّل أول ما الأدمن يفتح | 480 kB (151 kB gzip) | **423 kB (134.5 kB gzip)** |
| JS اللي بيتحمّل أول ما المتجر يفتح | 619 kB (191 kB gzip) | **598 kB (186 kB gzip)** |
| ملف `vendor-react` | 395 kB، وكان بيبلع react-icons وreact-query وlucide بالغلط | 287 kB: React وRouter بس |
| صفحة السيارات في الأدمن | `useEffect` + axios، من غير كاش | React Query مع كاش وعرض فوري |
| البحث في الحجوزات والعملاء | طلب API مع كل حرف بيتكتب | debounce لمدة 300ms |
| التنقل بين الصفحات في العملاء | مفيش أزرار | فيه أزرار |
| `/admin/brands` و API الماركات | **Fatal error** (500) | شغّال |
| صفحة `/admin` لو `site_name` أو `site_favicon` مش متسجّلين | **Crash** (500) | شغّالة |

---

## 2. تحسينات الباك إند

### 2.1 فلتر الحصان (أعلى أولوية)
**المشكلة:** `CarApiService::applyFilters` كان بيجيب كل السيارات النشطة (`get(['id','specs'])`)، ويفلترها في PHP، ويرجع للداتابيز بـ `whereIn('id', [...])` فيها قايمة IDs طويلة. الوقت والذاكرة بيكبروا مع عدد السيارات.

**الحل:**
- migration جديدة `2026_11_24_093000_add_horsepower_column_to_cars_table.php`:
  - عمود `horsepower` (`unsignedSmallInteger`، يقبل null).
  - index مركّب `idx_cars_active_hp` على (`is_active`, `horsepower`).
  - backfill للبيانات الموجودة بـ PHP و`chunkById`، فبيشتغل على MySQL وSQLite.
- `Car::parseHorsepower()`: بتاخد **أول رقم بس**. يعني "250 hp @ 6000 rpm" بتبقى 250، و"1,200 hp" بتبقى 1200، وأقصى قيمة 65535.
- الـ `saving` hook في `Car` بيحدّث العمود مع كل حفظ، ولو `specs.hp` اتمسحت العمود بيرجع null.
- الفلتر:
  ```php
  $query->whereNotNull('horsepower')
      ->when($minHp !== null, fn ($q) => $q->where('horsepower', '>=', $minHp))
      ->when($maxHp !== null, fn ($q) => $q->where('horsepower', '<=', $maxHp));
  ```
- `$appends = ['main_image']` فضلت زي ما هي، لأنها جزء من الـ API. الصفحة الرئيسية بترجع موديلات Car من غير Resource.

### 2.2 داشبورد الـ CRM: من 6 queries لواحد
`CRM/DashboardController::bookingStats()` بقى بيعمل query واحد بـ conditional aggregation (`SUM(CASE WHEN ...)`)، والقيم كلها bindings. مفاتيح `$stats` اللي بتروح للـ Blade زي ما هي (`total`, `open`, `pending`, `closed`, `completed`, `total_commission`).

### 2.3 إصلاح Fatal error في `BrandResource`
`app/Http/Resources/V1/BrandResource.php` كان فيه **سطر فاضي قبل `<?php`**. PHP بيرمي:
`strict_types declaration must be the very first statement`. النتيجة إن أي endpoint بيرجع ماركات (`/api/v1/brands` وصفحة الماركات وفلاتر السيارات) كان بيقع. شلت السطر.

### 2.4 إصلاح crash في `admin.blade.php`
الكود كان بيعمل `$globalSettings['site_name'] ?? $globalSettings->get(...)`. لما الإعدادات بتبقى array والمفتاح مش موجود، بينادي `->get()` على array فبيحصل crash. بقى `data_get($globalSettings ?? [], 'site_name')`، وده بيشتغل مع الـ array والـ Collection.

---

## 3. تحسينات الفرونت إند

### 3.1 تقسيم ملفات المكتبات (`vite.config.js`)
كود `manualChunks` اللي كان على `Master` كان بيعمل `id.includes('react')`. الشرط ده بيطابق **أي** package اسمها فيه react: `@tanstack/react-query` و`lucide-react` و`react-icons` و`react-toastify`. فكلهم كانوا بيروحوا لـ `vendor-react` (395 kB)، والأدمن كان بيحمّل أيقونات المتجر. وكمان `vendor-icons` و`vendor-query` (للـ react-query) عمرهم ما كانوا بيتعملوا.

الحل بالصيغة الرسمية في Vite 8 (Rolldown)، مع regex بيطابق اسم الـ package بالظبط:
```js
build: {
  target: 'es2020',
  rolldownOptions: {
    output: {
      codeSplitting: {
        groups: [
          { name: 'vendor-react', test: /node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/, priority: 20 },
          { name: 'vendor-query', test: /node_modules[\\/](@tanstack[\\/]|axios[\\/])/, priority: 10 },
        ],
      },
    },
  },
},
```
أيقونات lucide بقت بتتقسم تلقائياً، وكل صفحة بتحمّل الأيقونات اللي بتستخدمها بس.

### 3.2 صفحة السيارات في الأدمن (`CarsPage.tsx`): React Query
- `useQuery` لـ `/cars/meta-options` (الماركات والتصنيفات) بـ `staleTime` نص ساعة، فمش بتتحمّل تاني مع كل زيارة.
- `useQuery` للسيارات، والـ key فيه البحث والماركة والتصنيف والحالة والصفحة. فيه caching ومنع تكرار الطلبات، و`keepPreviousData` بتمنع الوميض أثناء الفلترة.
- `staleTime: 0` للقايمة: البيانات المتكاشة بتظهر فوراً، والتحديث بيحصل في الخلفية. وده مهم لما ترجع من `CarFormPage` بعد التعديل.
- الحذف والتفعيل والتمييز بيحدّثوا الكاش فوراً، وبعدها `invalidateQueries`.
- أي تغيير في فلتر بيرجّع لصفحة 1.
- البحث بيستخدم `useDebouncedValue` بدل `setTimeout` يدوي.

### 3.3 الحجوزات والعملاء
- **`BookingsPage`**: debounce للبحث 300ms، و`keepPreviousData`.
- **`LeadsPage`**: debounce للبحث، و`keepPreviousData`، وأزرار تنقّل بين الصفحات بمكوّن `shared/components/ui/Pagination`.

### 3.4 Hook مشترك
`resources/react/shared/hooks/useDebouncedValue.ts`، ومتصدّر من `shared/index.ts`.

### 3.5 حاجات كانت موجودة على `Master` قبلي
- Lazy loading لكل صفحات الأدمن (`AppRoutes.tsx`).
- `staleTime` 5 دقايق للأدمن (`admin/main.tsx`).
- `apiClient` فيه interceptor بيصلّح تكرار `/api/v1`.
- conditional aggregation في `Api/V1/DashboardController`.

---

## 4. الاختبارات والفحوصات

| الفحص | النتيجة |
|---|---|
| اختبارات جديدة `tests/Feature/Api/Store/CarHorsepowerFilterTest.php` (5) | ✅ |
| اختبارين جداد في `DashboardApiTest`: توزيع الحالات، والقيم صفر لو مفيش بيانات | ✅ |
| الـ test suite كاملة | **221 / 223** ✅ (قبل الإصلاحات: الـ suite كانت بتقع كلها بـ Fatal error) |
| `vendor/bin/pint --dirty` | ✅ |
| `npx tsc --noEmit` على الملفات اللي اتعدّلت | ✅ مفيش أخطاء |
| `npm run build` | ✅ |
| migration على MySQL | ✅ |

**الاختبارين اللي لسه بيفشلوا** سببهم تغييرات مقصودة على `Master`. الكود اتغيّر والاختبارات ما اتحدّثتش:
1. `SettingsCacheTest::test_crm_login_page_renders_site_name_from_cached_settings`: بيستنى 200 من `/manager-login`، لكن الصفحة دلوقتي بتعمل redirect (302).
2. `BookingWorkflowTest::test_delivering_booking_saves_financial_details...`: بيستنى redirect لـ `/admin/bookings`، والفعلي `/admin/bookings?booking_id=1`.

لو التغييرين دول مقصودين، الاختبارات محتاجة تتحدّث.

---

## 5. خطوات النشر

```bash
git pull origin Master
composer install --no-dev --optimize-autoloader
php artisan migrate --force        # بيضيف عمود horsepower ويملاه
npm ci && npm run build
php artisan optimize               # config + route + view + event cache
php artisan cache:clear            # عشان كاش cars.filters وhome.data يتبني من جديد
```

**الرجوع (Rollback):** `php artisan migrate:rollback --step=1` بيمسح العمود والـ index، ولازم ترجّع الكود هو كمان.

⚠️ **ملاحظة على migration موجودة على `Master`:** `2026_11_19_132935_add_performance_indexes_to_core_tables.php` الـ `up()` بتاعها فاضي، والـ `down()` بيعمل drop لـ indexes. أي rollback يوصل للـ migration دي هيفشل، لو الـ indexes مش موجودة.

---

## 6. الملفات اللي اتغيّرت

**باك إند:** `app/Models/Car.php` · `app/Services/Api/Store/CarApiService.php` · `app/Http/Controllers/CRM/DashboardController.php` · `app/Http/Resources/V1/BrandResource.php` · `resources/views/admin.blade.php` · `database/migrations/2026_11_24_093000_add_horsepower_column_to_cars_table.php` (جديد)

**فرونت إند:** `vite.config.js` · `resources/react/admin/pages/{Cars,Bookings,Leads}Page.tsx` · `resources/react/shared/hooks/useDebouncedValue.ts` (جديد) · `resources/react/shared/index.ts`

**اختبارات:** `tests/Feature/Api/Store/CarHorsepowerFilterTest.php` (جديد) · `tests/Feature/Api/V1/DashboardApiTest.php`

**توثيق:** `docs/PROJECT_MAP.md` (خريطة المشروع للـ AI) · `CLAUDE.md` و`AGENTS.md` (فيهم إشارة للخريطة)

---

## 7. اللي ما اتنفذش

| البند | السبب |
|---|---|
| حذف الـ dependencies اللي مش مستخدمة (webpack، laravel-mix، vue...) | محتاج موافقة |
| تقسيم `/store/home` لأكتر من endpoint | تغيير في العقد بين الواجهة والـ API |
| مراجعة حذف الكاش في الـ observers، والإعدادات (Redis والضغط) | ما اتراجعتش |
| قياس TTFB ووقت تحميل الصفحة في المتصفح | اتوقف بناءً على طلبك |

## 8. توصيات للمرحلة الجاية

1. **`highlightedCars`** في `HomeCacheService` بيحمّل كل السيارات المميزة من غير `limit`. حط حد أقصى.
2. **`budgetRanges`** بيعمل query لكل شريحة ميزانية وقت بناء كاش `home.data`.
3. **البحث بـ `LIKE '%...%'`** على أعمدة JSON مش بيستفيد من أي index. استخدم generated columns أو FULLTEXT لو البيانات كبرت.
4. **Redis** بدل `database` للكاش والـ session والـ queue في الإنتاج.
5. **`storage/framework/views`:** ملفات الـ views المترجمة لسه متتبّعة في git، مع إن فيه commit اسمه "ignore storage cache". امسحها من الـ index بـ `git rm -r --cached storage/framework/views`.
6. **قياس في الإنتاج:** TTFB لـ `/api/v1/store/home` و`/cars`، وLCP للصفحة الرئيسية.
