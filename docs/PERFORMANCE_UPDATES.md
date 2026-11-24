# تقرير تحسينات الأداء — Tameed

> التاريخ: 2026-11-24 · المرجع: خطة `tameed-performance-optimization-prompt.md`

> ⚠️ **مكان التعديلات دلوقتي:** اتعملت على فرع `main` ومعملناش لها commit. بعدها GitHub Desktop عمل stash لكل التعديلات باسم `!!GitHub_Desktop<main>` (`stash@{0}`)، وحوّل لفرع `Master`. يعني **كل اللي في التقرير ده محفوظ في الـ stash، ومش موجود في الكود الحالي على `Master`**.
> - لرجوعها على `main`: `git checkout main` وبعدها `git stash pop`
> - لنقلها لـ `Master`: `git stash apply` وبعدها حل الـ conflicts. `Master` فيه إعادة هيكلة مختلفة (مثلاً `resources/react/shared/` و`manualChunks` بصيغة function في `vite.config.js`)
> - الـ stash فيه كمان ملفات مش جزء من التحسينات دي: `admin.css` و`.env copy.example`

---

## 1. الملخص

| البند | قبل | بعد |
|---|---|---|
| فلتر الحصان في المتجر | بيحمّل كل السيارات النشطة في PHP ويفلترها في الذاكرة | `WHERE` على عمود `horsepower` عليه index |
| إحصائيات داشبورد الأدمن (`/api/v1/dashboard/stats`) | 12 query | **3 queries** |
| إحصائيات داشبورد الـ CRM (`/crm/dashboard`) | 6 queries للإحصائيات | **query واحد** |
| JS اللي بيتحمّل أول ما الأدمن يفتح | 453 kB (139 kB gzip) | **380 kB (123 kB gzip)** |
| ملفات المكتبات (React وTanStack Query وaxios) | جوّه ملفات الصفحات، وأي deploy بيلغي كاشها | ملفات منفصلة، بتفضل في كاش المتصفح بعد الـ deploy |
| البحث في الحجوزات والعملاء | طلب API مع كل حرف بيتكتب | debounce لمدة 300ms |
| صفحة السيارات في الأدمن | **ما كانتش شغّالة** (المسار غلط، وكانت بتقع وقت العرض) | شغّالة وبتستخدم React Query |
| التنقل بين الصفحات في الحجوزات والعملاء | مفيش أزرار | فيه أزرار السابق/التالي |
| `npm run build` | **كان بيفشل** | شغّال |

---

## 2. تحسينات الباك إند

### 2.1 فلتر الحصان (أعلى أولوية)
**المشكلة:** `CarApiService::applyFilters` كان بيعمل `Car::where('is_active', true)->get(['id','specs'])`، يعني بيجيب كل السيارات النشطة. بعدها بيفلتر في PHP، ويرجع للداتابيز بـ `whereIn('id', [...])` فيها قايمة IDs ممكن تكون طويلة. الوقت والذاكرة بيكبروا مع عدد السيارات.

**الحل:**
- migration جديدة `2026_11_24_093000_add_horsepower_column_to_cars_table.php`:
  - عمود `horsepower` (`unsignedSmallInteger`، يقبل null).
  - index مركّب `idx_cars_active_hp` على (`is_active`, `horsepower`).
  - backfill للبيانات الموجودة بـ PHP و`chunkById`، فبيشتغل على MySQL وSQLite.
- `Car::parseHorsepower()`: دالة واحدة لاستخراج الرقم، بتاخد **أول رقم بس**. يعني "250 hp @ 6000 rpm" بتبقى 250، مش 2506000.
- الـ `saving` hook في `Car` بيحدّث العمود مع كل حفظ، ولو `specs.hp` اتمسحت العمود بيرجع null.
- الفلتر بقى:
  ```php
  $query->whereNotNull('horsepower')
      ->when($minHp !== null, fn ($q) => $q->where('horsepower', '>=', $minHp))
      ->when($maxHp !== null, fn ($q) => $q->where('horsepower', '<=', $maxHp));
  ```

**الملفات:** `app/Models/Car.php` · `app/Services/Api/Store/CarApiService.php` · migration جديدة.

### 2.2 داشبورد الأدمن: من 12 query لـ 3
**المشكلة:** `Api/V1/DashboardController::stats` كان بيعمل `(clone $query)->count()` 6 مرات للحجوزات، ومرتين للعملاء، و4 مرات للمهام.

**الحل:** query واحد لكل جدول، باستخدام conditional aggregation:
```sql
SELECT COUNT(*) AS total,
       SUM(CASE WHEN status IN (...) THEN 1 ELSE 0 END) AS active,
       SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
       ...
       SUM(CASE WHEN status IN (...) THEN net_commission ELSE 0 END) AS total_commission
FROM bookings WHERE <نفس فلاتر الموظف والفترة>
```
- اتقسّم على 3 دوال: `bookingStats()` و`leadStats()` و`taskStats()`.
- **شكل الـ JSON زي ما هو بالظبط.** نفس المفاتيح، والقيم أرقام (int/float).
- كل القيم معمولة bindings، ومفيش أي input داخل في الـ SQL مباشرة.
- المهام بتستخدم `DATE(due_date)`، ودي بتشتغل على MySQL وSQLite.

### 2.3 داشبورد الـ CRM: من 6 queries لواحد
نفس الأسلوب في `CRM/DashboardController::bookingStats()`. مفاتيح `$stats` اللي بتروح للـ Blade زي ما هي (`total`, `open`, `pending`, `closed`, `completed`, `total_commission`).

---

## 3. تحسينات الفرونت إند

### 3.1 Code splitting للوحة الأدمن
`admin/routes/AppRoutes.tsx`: الصفحات التسعة اتحوّلت لـ `React.lazy` + `Suspense` مع spinner. صفحة الدخول فضلت بتتحمّل مباشرة، لأنها أول صفحة بتظهر.

### 3.2 فصل ملفات المكتبات
**ملاحظة مهمة:** Vite 8 بيستخدم **Rolldown**، ومش بيقبل `manualChunks` بصيغة object، وده كان موقّف الـ build بالكامل. استخدمت الصيغة الصح:
```js
build: {
  rolldownOptions: {
    output: {
      codeSplitting: {
        groups: [
          { name: 'vendor-react', test: /node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/, priority: 20 },
          { name: 'vendor-query', test: /node_modules[\\/]@tanstack[\\/]/, priority: 10 },
          { name: 'vendor-axios', test: /node_modules[\\/]axios[\\/]/, priority: 10 },
        ],
      },
    },
  },
},
```
`lucide-react` و`react-icons` اتسابوا من غير مجموعة عن قصد. لو اتجمعوا في ملف واحد، الأدمن هيحمّل أيقونات المتجر.

### 3.3 صفحة السيارات في الأدمن (`CarsPage.tsx`)
كانت فيها **3 أخطاء** بتمنعها تشتغل:
1. الـ `apiClient` واخد `baseURL: '/api/v1'`، والصفحة كانت بتطلب `/api/v1/cars`. النتيجة إن الطلب بيروح لـ `/api/v1/api/v1/cars` ويرجع 404.
2. كانت بتقرا `res.data` و`res.meta` من الـ axios response نفسه، مش من الـ body.
3. كانت بتنادي `useAuth().hasPermission`، والدالة دي مش موجودة (الموجود `can`)، فالصفحة بتقع وقت العرض.

**التحويل لـ React Query:**
- `useQuery` للسيارات، والـ key فيه كل الفلاتر والصفحة. فيه caching ومنع تكرار الطلبات، و`keepPreviousData` بتمنع الوميض أثناء الفلترة.
- `useQuery` للماركات بـ `staleTime` نص ساعة.
- بعد الحذف أو التفعيل الكاش بيتحدّث فوراً، وبعدها `invalidateQueries`.
- أي تغيير في فلتر بيرجّع لصفحة 1.
- صلّحت أخطاء TypeScript القديمة: `Badge variant="neutral"` بقت `"slate"`، وشلت props مش موجودة في `Card`.

### 3.4 الحجوزات والعملاء: debounce + أزرار تنقّل
- `useDebouncedValue` جديد في `resources/react/admin/hooks/useDebouncedValue.ts`. الطلب بيتبعت بعد ما الكتابة تقف 300ms.
- مكوّن `Pagination` جديد في `resources/react/admin/components/ui/Pagination.tsx`، ومستخدم في السيارات والحجوزات والعملاء.
- `keepPreviousData` في الصفحتين.

### 3.5 `staleTime` للأدمن
`admin/main.tsx`: من 30 ثانية لـ 5 دقايق. الـ mutations في الحجوزات والمهام بتعمل `invalidateQueries`، فالبيانات بتتحدّث بعد أي تعديل.

---

## 4. تعديلات كانت موجودة قبلي وصلّحتها

كان فيه تعديلات من محاولة سابقة في الـ working tree، وفيها مشاكل:

| التعديل السابق | المشكلة | اللي اتعمل |
|---|---|---|
| حذف `main_image` من `$appends` في `Car` | كان هيكسر صور الصفحة الرئيسية. `featured_cars` و`offer_cars` و`highlighted_cars` بترجع من الـ model مباشرة من غير Resource. والـ accessor أصلاً مش بيعمل query | **رجّعته** |
| backfill بـ `REGEXP_REPLACE` / `JSON_EXTRACT` | MySQL بس، فالاختبارات (SQLite) هتفشل | backfill بـ PHP |
| استخراج الحصان بـ `preg_replace('/[^0-9]/', '')` | "250 hp @ 6000" بتبقى 2506000 وتعدّي حجم العمود | أول رقم بس، وأقصى قيمة 65535 |
| الـ hook بيحدّث العمود بس لما القيمة موجودة | لو `hp` اتمسحت، العمود بيفضل بالقيمة القديمة | بيتحدّث مع كل حفظ |
| `manualChunks` بصيغة object | `npm run build` بيفشل | `codeSplitting.groups` |

---

## 5. الاختبارات والفحوصات

| الفحص | النتيجة |
|---|---|
| اختبارات جديدة `tests/Feature/Api/Store/CarHorsepowerFilterTest.php` (5) | ✅ |
| اختبارين جداد في `DashboardApiTest`: توزيع الحالات، والقيم صفر لو مفيش بيانات | ✅ |
| الاختبارات المرتبطة (Dashboard وCar وAdminSpa وStoreApi وCalculator) | ✅ 20/20 |
| `vendor/bin/pint --dirty` | ✅ |
| `npx tsc --noEmit` على الملفات اللي اتعدّلت | ✅ مفيش أخطاء |
| `npm run build` | ✅ |
| الـ test suite كاملة | ⬜ لسه ما اتشغّلتش |
| migration على MySQL | ✅ اشتغلت على قاعدة `tameed_bench` |

**ملاحظة:** داشبورد الـ CRM مالهوش اختبار HTTP، لأنه بيستخدم `FIELD()`، ودي موجودة في MySQL بس.

---

## 6. خطوات النشر

```bash
composer install --no-dev --optimize-autoloader
php artisan migrate --force        # بيضيف عمود horsepower ويملاه
npm ci && npm run build
php artisan optimize               # config + route + view + event cache
php artisan cache:clear            # عشان كاش cars.filters وhome.data يتبني من جديد
```

**الرجوع (Rollback):** `php artisan migrate:rollback --step=1` بيمسح العمود والـ index. الكود الجديد بيعتمد على العمود، فلازم ترجّع الكود هو كمان.

---

## 7. الملفات اللي اتغيّرت

**باك إند**
- `app/Models/Car.php`
- `app/Services/Api/Store/CarApiService.php`
- `app/Http/Controllers/Api/V1/DashboardController.php`
- `app/Http/Controllers/CRM/DashboardController.php`
- `database/migrations/2026_11_24_093000_add_horsepower_column_to_cars_table.php` (جديد)

**فرونت إند**
- `vite.config.js`
- `resources/react/admin/main.tsx` (`staleTime` بس)
- `resources/react/admin/routes/AppRoutes.tsx`
- `resources/react/admin/pages/CarsPage.tsx`
- `resources/react/admin/pages/BookingsPage.tsx`
- `resources/react/admin/pages/LeadsPage.tsx`
- `resources/react/admin/components/ui/Pagination.tsx` (جديد)
- `resources/react/admin/hooks/useDebouncedValue.ts` (جديد)

**اختبارات**
- `tests/Feature/Api/Store/CarHorsepowerFilterTest.php` (جديد)
- `tests/Feature/Api/V1/DashboardApiTest.php`

> مش جزء من التحسينات دي: `resources/react/admin/admin.css` وسطر `import './admin.css'` في `admin/main.tsx` (اتضافوا من مصدر تاني)، وحذف `.env.example` وظهور `.env copy.example`، وتغيير نهايات السطور في `package-lock.json`.

---

## 8. اللي ما اتنفذش من الخطة

| البند | السبب |
|---|---|
| حذف الـ dependencies اللي مش مستخدمة (webpack، laravel-mix، vue، vue-router، vue-toastification...) | محتاج موافقة، و`resources/js` فيها بقايا Vue/ERP |
| تقسيم `/store/home` لأكتر من endpoint | تغيير في العقد بين الواجهة والـ API، ومحتاج قرار |
| بيانات القوائم المنسدلة في الـ CRM (create/edit) | مؤجّل |
| مراجعة حذف الكاش في الـ observers | ما اتراجعتش |
| مراجعة الإعدادات (session/cache/queue drivers، الضغط، الاتصال بالداتابيز) | ما اتراجعتش |
| قياس سرعة الـ endpoints ووقت تحميل الصفحة في المتصفح | اتوقف في النص بناءً على طلبك |

---

## 9. توصيات للمرحلة الجاية

1. **`highlightedCars`** في `HomeCacheService` بيحمّل كل السيارات المميزة مع علاقاتها من غير `limit`. حط حد أقصى.
2. **`budgetRanges`** بيعمل query لكل شريحة ميزانية وقت بناء كاش `home.data`. ممكن يتجمّع.
3. **البحث بـ `LIKE '%...%'`** على أعمدة JSON (`name->ar`) مش بيستفيد من أي index. لو السيارات زادت، استخدم generated columns أو FULLTEXT.
4. **Cache driver = `database`:** في الإنتاج يفضّل Redis. نفس الكلام على الـ session والـ queue.
5. **صفحات تانية في الأدمن** محتاجة مراجعة، لأنها ممكن يكون فيها نفس مشكلة المسار المتكرر `/api/v1/...` اللي كانت في CarsPage.
6. **قياس في الإنتاج:** TTFB لـ `/api/v1/store/home` و`/cars`، وLCP للصفحة الرئيسية، وعدد الـ queries لكل صفحة (Pail أو Telescope).
