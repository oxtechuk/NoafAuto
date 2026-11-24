# ربط أي فرونت (Static) بباك إند Sitekit — الطريقة + خطة noauf

> الهدف: أي مشروع جديد = **تحط فولدر الفرونت** في مكان ثابت، وتكتب **ملف mappers واحد**، والموقع يشتغل ديناميك على Sitekit، من غير ما تغيّر أي صفحة في الفرونت ولا أي حاجة في النواة.
> المثال: `resources/noauf` (React 19 + Vite 8 + Tailwind 4، بيانات mock، وكل الطلبات بتعدّي على `src/services/*`).

---

## ✅ اللي اتنفّذ (2026-11-24): noauf بقى شغّال ديناميك على Sitekit

**النواة (بتتحدّث مع كل العملاء):**
- **`config('sitekit.storefront')`:** فيه `enabled` و`path` و`public_path`. الإعدادات من `.env`: `SITEKIT_STOREFRONT_ENABLED` و`SITEKIT_STOREFRONT_PATH`.
- **`StorefrontManager`:** بيقرا `public/storefront/index.html` (الناتج من build الفرونت)، وبيحقن ملفاته جوّه `resources/views/app.blade.php`. يعني **الـ SEO والـ OG والـ JSON-LD والـ Pixels والـ 404 الحقيقي** بيفضلوا من Laravel لأي فرونت.
- **`php artisan sitekit:storefront:build [--path=] [--skip-install]`:** بيعمل `npm ci` وبعدها build، وبعدها بينسخ `dist/` لـ `public/storefront/`.
- **`sitekit-update.yml` و`deploy.sh`:** لو الفرونت موجود، بيتعمله build في GitHub ويتنشر مع الأصول، وفيه rollback ليه هو كمان. المسار بيتغيّر من variable `SITEKIT_STOREFRONT_PATH`.
- **إصلاح bug في `CalculatorApiService`:** طلب الحاسبة من غير سيارة كان بيرجّع 500، لأن `bookings.car_id` مطلوب. دلوقتي الـ lead بيتحفظ من غير booking.

**noauf (`resources/noauf`):**
- **`src/sitekit-sdk/`:** فيه `types.ts` و`client.ts` (**عامّين، بيتنسخوا زي ما هم لأي مشروع**)، و`mappers.ts` (**خاص بـ noauf**).
- **`services/cars.ts` و`content.ts` و`forms.ts`:** في الإنتاج بينادوا Sitekit، والـ mock فاضل للتطوير.
- **`vite.config.ts`:** `base: '/storefront/'` في الـ build، وproxy لـ `/api` في الـ dev.
- **`.env.production`:** `VITE_USE_MOCK=false`. يعني الـ build ديناميك من غير أي إعداد.
- **`lib/asset.ts`:** للصور الثابتة. وصفحة التواصل بقت بتبعت مفتاح الموضوع (`subject`).

**اتجرّب فعلياً** على قاعدة بيانات فيها 500 سيارة: Laravel بيقدّم noauf بـ SEO لكل صفحة (عنوان صفحة السيارة جاي من الداتابيز)، وChrome headless بيعرض السيارات الحقيقية في الرئيسية والقائمة والتفاصيل. والفورمز (تواصل، وحاسبة، وطلب مخصص) بتتسجّل كـ Leads وBookings في الـ CRM.

**تصحيح للخطة:** أغلب "الفجوات" في §5.1 مش موجودة. العروض فيها `tag` وفلتر بيه. صفحة المقال بترجّع `related_posts`. الطلب المخصص بيروح كرسالة تواصل `car_import` بكل التفاصيل. والحاسبة بتستقبل `car_ids`. **يعني ربط noauf ما احتاجش أي endpoint جديد.**

### أوامر الـ build (من جذر المشروع)
| الأمر | بيعمل إيه |
|---|---|
| `npm run build:store` | بيبني المتجر (الفرونت اللي في `SITEKIT_STOREFRONT_PATH`) وبينشره في `public/storefront` |
| `npm run build:dashboard` | بيبني لوحة التحكم (ومعاها متجر Tameed المدمج الاحتياطي) في `public/build` |
| `npm run build:all` | الاتنين مع بعض |

- **الإعداد مرة واحدة في `.env`:** `SITEKIT_STOREFRONT_PATH=resources/noauf` و`SITEKIT_STOREFRONT_ENABLED=true`.
- **`npm install` للمتجر:** بيحصل أوتوماتيك أول مرة بس. ولو عايز تعيده: `php artisan sitekit:storefront:build --fresh`.
- **النشر شغّال والسيرفر شغّال:** بيتنسخ اللي اتغيّر بس، فمفيش "Permission denied" على Windows.

### التطوير
```bash
cd resources/noauf && npm run dev                      # VITE_USE_MOCK=true (بيانات تجريبية)
VITE_USE_MOCK=false npm run dev                          # الـ API الحقيقي عبر proxy → SITEKIT_BACKEND_URL
```

### متبقي (مش مانع للتشغيل)
- **حجم الـ bundle:** noauf حجمه 578 kB (172 kB gzip) في ملف واحد. محتاج `React.lazy` للصفحات زي متجر Tameed.
- **المحتوى الثابت:** `data/content.ts` (الهيرو، من نحن، الأرقام، `SITE` في `lib/constants.ts`) لسه ثابت في الفرونت. محتاج يتنقل لـ `/store/home` و`/store/settings/footer`.
- **`useApi`:** يتحوّل لـ TanStack Query.
- **أنواع الـ SDK:** تتولّد أوتوماتيك من Scramble، ومحتاج موافقة على `openapi-typescript`.

---

## 1. الفكرة (3 طبقات)

```
 صفحات الفرونت (مش بتتغيّر)
        │  بتنادي على getCars(), getOffers(), sendContact() ...   ← نفس الأسماء الموجودة
        ▼
 src/services/*.ts   ← طبقة الربط بتاعة المشروع: بتنادي الـ SDK وبتعدّي النتيجة على mappers
        │
        ├── sitekit-sdk/   ← نسخة ثابتة من النواة: client جاهز لـ /api/v1/store/* بأنواع Sitekit
        └── mappers.ts     ← الملف الوحيد اللي بيتكتب لكل مشروع: Sitekit shape ← شكل الفرونت
        ▼
 Laravel: /api/v1/store/*   ← نفس الـ API لكل المشاريع (عقد ثابت، وبيتحدّث مع النواة)
```

**ليه الطريقة دي:**
- **النواة مش بتتغيّر علشان كل مشروع.** أي تحديث للنواة بيوصل لكل العملاء من غير ما يكسر حاجة.
- **الفرونت مش بيتغيّر علشان الـ API.** الـ designer بيسلّم فرونت بـ mock، والمطوّر بيكتب `mappers.ts` بس.
- **فيه نقطة واحدة تراجعها** لو شكل البيانات اتغيّر.

---

## 2. القواعد الثابتة لأي فرونت جديد (تتبعت للـ designer/المطوّر قبل ما يبدأ)

1. **مكان الفولدر:** `resources/storefront/` في ريبو العميل. فولدر واحد لكل مشروع، وليه `package.json` و`vite.config` بتوعه.
2. **ممنوع أي `fetch` أو `axios` جوّه الصفحات.** كل البيانات لازم تعدّي على `src/services/*`. noauf ماشي على القاعدة دي بالفعل ✅.
3. **ممنوع أي نص ثابت في الصفحات** للمحتوى اللي العميل هيغيّره (الهيرو، من نحن، أرقام التواصل، السوشيال). مكانه `services/content.ts`، ووقت الربط بيتنقل للأدمن.
4. **الـ ID في الروابط يبقى `slug`** (`/cars/mercedes-s500-2025`) مش رقم. ده بيفيد في الـ SEO، وهو الموجود في Sitekit.
5. **اللغة:** بتتبعت في header `Accept-Language: ar|en`، والـ API بيرجّع النصوص مترجمة. noauf بيعمل كده ✅.
6. **الصور:** مفيش صور محتوى جوّه `public/` بتاع الفرونت. الصور بتترفع من الأدمن، وبتتضغط WebP أوتوماتيك (`ImageOptimizerService`). يُسمح بس باللوجو والأيقونات والخلفيات الثابتة.
7. **المتغيرات:**
   ```dotenv
   VITE_USE_MOCK=false
   VITE_API_URL=/api/v1/store      # نسبي — نفس الدومين، مفيش CORS
   ```
8. **الـ build:** `npm run build` بيطلّع `dist/` بـ `base: '/storefront/'`.

---

## 3. التقديم من Laravel (مرة واحدة في النواة)

**القرار: build منفصل للفرونت**، مش جوّه `vite.config.js` بتاع النواة.
- **السبب:** كل فرونت ليه مكتباته ونسخها الخاصة (noauf بيستخدم TypeScript 7 وi18next 27، والنواة نسخ مختلفة). الدمج هيعمل تعارض مع كل تحديث للنواة.

**المطلوب في النواة:**

| الجزء | الوظيفة |
|---|---|
| `config/sitekit.php` → `storefront.path` (افتراضي `resources/storefront`) و`storefront.public` (افتراضي `public/storefront`) | المسارات |
| `php artisan sitekit:storefront:build` | بيعمل `npm ci && npm run build` جوّه الفولدر، وبعدها بينسخ `dist/` لـ `public/storefront/` |
| `StorefrontController` (عام) | بيقرا `public/storefront/index.html`، ويحقن **SEO meta** للصفحة (`SeoEntryResolver` و`SeoContentBuilder` الموجودين) جوّه `<head>`، ويرجّعها مع status صحيح (404 للسيارة اللي مش موجودة) |
| Route fallback | أي مسار غير `/api` و`/admin` و`/crm` و`/storage` بيروح لـ `StorefrontController`. لو مفيش storefront، المتجر الحالي (`resources/react`) بيشتغل زي ما هو |
| `sitekit-update.yml` | خطوة جديدة: لو `resources/storefront/package.json` موجود، يتعمل build للفرونت ويتضاف `public/storefront` لملف الأصول اللي بيتنشر |

> النتيجة: الفرونت والـ API والأدمن على **نفس الدومين**. مفيش CORS ولا Sanctum للزوار، والـ SEO بيتعمل server-side.

---

## 4. Sitekit Storefront SDK

فولدر صغير بيتنسخ جوّه أي فرونت: `src/sitekit-sdk/`. مصدره في النواة، فبيتحدّث معاها.

```ts
// src/sitekit-sdk/client.ts
export const sitekit = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? '/api/v1/store' })
sitekit.interceptors.request.use((c) => { c.headers['Accept-Language'] = currentLang(); return c })

// src/sitekit-sdk/api.ts  — أنواع Sitekit الخام (SkCar, SkOffer, SkBlogPost, SkPaginated<T> …)
export const SitekitApi = {
  home:        () => get<SkHome>('/home'),
  settings:    () => get<SkSettings>('/settings'),
  cars:        (q: SkCarQuery) => getPaginated<SkCar>('/cars', q),
  carsMeta:    () => get<SkCarsMeta>('/cars/meta'),
  car:         (slug: string) => get<SkCarDetail>(`/cars/${slug}`),
  compare:     (slugs: string[]) => get<SkCompare>('/cars/compare', { cars: slugs }),
  brands:      () => get<SkBrand[]>('/brands'),
  offers:      () => get<SkOffer[]>('/offers'),
  blog:        (q) => getPaginated<SkBlogPost>('/blog', q),
  blogPost:    (slug: string) => get<SkBlogPostDetail>(`/blog/${slug}`),
  testimonials:() => get<SkTestimonial[]>('/testimonials'),
  partners:    () => get<SkPartner[]>('/partners'),
  faqs:        () => get<SkFaq[]>('/faqs'),
  contact:     (p: SkContactPayload) => post('/contact', p),
  calculatorLead: (p) => post('/calculator/lead', p),
  booking:     (p: SkBookingPayload) => post('/booking', p),
}
```
- **الأنواع (`Sk*`) بتتولّد من توثيق Scramble** (`/docs/api.json`) بأمر `sitekit:sdk:types`، فمش بتتكتب بإيد وبتفضل مطابقة للباك إند دايماً. ده محتاج موافقة على dependency `openapi-typescript` كـ devDependency.
- **اختبار عقد في النواة (`StoreApiContractTest`):** بيتأكد إن شكل ردود `/api/v1/store/*` مش بيتغيّر. أي تغيير بيكسر العقد بيوقّف الـ release قبل ما يوصل للعملاء.

---

## 5. خطة noauf بالتفصيل

### 5.1 خريطة الـ Endpoints
| noauf (`services/*`) | Sitekit | الحالة |
|---|---|---|
| `getCars(filters)` → `GET /cars` | `GET /store/cars` | ✅ mapper (الأسماء: `brand`←`brands`، `minPrice`←`min_price`، `sort: newest`←`latest`، `fuel`، `page`) |
| `getLatestCars()` → `/cars/latest` | `GET /store/cars?sort=latest&per_page=8` | ✅ mapper |
| `getCar(id)` → `/cars/{id}` | `GET /store/cars/{slug}` | ✅ noauf يستخدم slug |
| `getSimilarCars(id)` | نفس `GET /store/cars/{slug}` → `related_cars` | ✅ mapper |
| `getCarFilterOptions()` → `/cars/filters` | `GET /store/cars/meta` → `filter_brands`, `filter_models`, `filter_years`, `filter_fuels` | ✅ mapper |
| `getOffers(tag)` | `GET /store/offers` | ⚠️ **ناقص:** حقل `tag` (popular/exclusive/new/limited) والتصنيف المميز. نضيف عمود `tag` + `is_featured` للعروض |
| `getArticles()` / `getArticle(slug)` | `GET /store/blog`, `/store/blog/{slug}` | ⚠️ noauf عايز `sections[]` + `figures[]` منظّمة، وSitekit بيرجّع محتوى HTML. **القرار:** نضيف حقل `content_blocks` (JSON) اختياري للمقال، ولو مش موجود الـ mapper يحط الـ HTML في section واحدة |
| `getRelatedArticles(slug)` | — | ⚠️ **ناقص:** `GET /store/blog/{slug}/related` (نفس التصنيف، limit 3) |
| `getBrands`, `getPartners`, `getTestimonials`, `getFaqs` | موجودين | ✅ mapper بسيط |
| `sendContact()` | `POST /store/contact` | ✅ (`subject` و`consent` لازم يتضافوا للـ validation لو مش موجودين) |
| `saveFinanceLead()` → `/finance/leads` | `POST /store/calculator/lead` | ✅ mapper (`city` بيتحفظ في الملاحظات أو حقل جديد) |
| `submitFinanceRequest()` | `POST /store/booking` (`booking_type=purchase` + salary/obligations/down_payment/months) | ✅ mapper |
| `submitCustomCarRequest()` → `/car-requests` | `POST /store/booking` (`booking_type=inquiry`) | ⚠️ **ناقص:** حقول الطلب المخصص (اسم السيارة، اللون، جهة العمل، القطاع...). نضيف `details` JSON للحجز |
| `data/content.ts` (الهيرو، الأرقام، من نحن، التواصل، الفوتر) | `GET /store/home`, `/store/settings`, `/store/about`, `/store/settings/footer` | ✅ mapper. والمحتوى بيتنقل للأدمن (HomeSection + Settings) |
| ألوان ولوجو (design tokens) | `GET /store/settings` → `CompanyBranding` | ✅ الفرونت بيقرا اللوجو من الإعدادات |

### 5.2 خريطة حقول `Car` (مثال mapper)
```ts
// src/sitekit-sdk/mappers.ts  (خاص بـ noauf)
export const toCar = (c: SkCar): Car => ({
  id: c.slug,
  brand: c.brand?.name ?? '',
  model: c.name,
  year: c.year,
  category: (c.type as CarCategory) ?? 'sedan',
  categoryLabel: c.category?.name ?? '',
  fuel: (c.specs?.fuel as FuelType) ?? 'petrol',
  fuelLabel: t(`fuel.${c.specs?.fuel ?? 'petrol'}`),
  seats: Number(c.specs?.seats ?? 5),
  transmissionLabel: c.specs?.transmission ?? t('transmission.auto'),
  engine: c.specs?.engine ?? '',
  horsepower: parseInt(String(c.specs?.hp ?? '0'), 10) || 0,
  cashPrice: c.current_price ?? c.cash_price,
  monthlyPrice: c.min_installment ?? 0,
  image: c.main_image ?? PLACEHOLDER,
  gallery: c.images ?? [],
  isNew: c.is_current_year,
  available: c.availability_status === 'available',
  series: c.model?.toUpperCase(),
  description: c.description ?? undefined,
  features: c.features_list?.map((f) => f.name),
})
export const toPaginated = <S, T>(r: SkPaginated<S>, map: (s: S) => T): Paginated<T> => ({
  data: r.data.map(map),
  meta: { currentPage: r.meta.current_page, lastPage: r.meta.last_page, total: r.meta.total },
})
```
وطبقة الربط في noauf بتبقى سطر واحد لكل دالة:
```ts
export async function getCars(filters: CarFilters = {}) {
  if (USE_MOCK) return mockGetCars(filters)          // الـ mock فاضل للتطوير من غير باك إند
  return toPaginated(await SitekitApi.cars(toCarQuery(filters)), toCar)
}
```

### 5.3 خطوات التنفيذ لـ noauf
| # | المهمة | المكان | تقدير |
|---|---|---|---|
| 1 | `StorefrontController` + route fallback + `sitekit:storefront:build` + خطوة build في `sitekit-update.yml` | النواة | 1–1.5 يوم |
| 2 | `sitekit-sdk` (client + أنواع + `sitekit:sdk:types`) + `StoreApiContractTest` | النواة | 1.5 يوم |
| 3 | سد الفجوات في الباك إند: `offers.tag/is_featured`، و`blog/{slug}/related`، و`blog.content_blocks`، و`bookings.details` للطلب المخصص، و`city/consent/subject` في الفورمز | النواة (migrations إضافية بس) | 2 يوم |
| 4 | نقل noauf لـ `resources/storefront` + `base: '/storefront/'` + `.env` | ريبو العميل | ساعة |
| 5 | `mappers.ts` + إعادة كتابة `services/cars.ts` و`content.ts` و`forms.ts` (مع الإبقاء على الـ mock) | ريبو العميل | 2 يوم |
| 6 | نقل `data/content.ts` والصور للأدمن (HomeSections, Settings, Media)، وseeder لمحتوى noauf | ريبو العميل | 1 يوم |
| 7 | استبدال `useApi` بـ TanStack Query (كاش ومنع تكرار الطلبات) | ريبو العميل | نص يوم |
| 8 | SEO لكل صفحة (title وdescription وog وJSON-LD للسيارة) من `StorefrontController` | النواة | يوم |
| 9 | اختبار كامل: الفلاتر، المقارنة، الحاسبة، الفورمز وهي بتوصل للأدمن كـ Leads/Bookings، اللغتين | — | يوم |

**الإجمالي:** حوالي **8–10 أيام عمل**. البنود 1 و2 و3 و8 بيتعملوا مرة واحدة في النواة، وأي فرونت بعد كده بياخد البنود 4–7 بس (**يومين أو تلاتة**).

---

## 6. Checklist مشروع جديد (بعد ما النواة تخلص)

```
1. ريبو العميل: clone من Sitekit الأساسي (docs/SITEKIT_UPDATES_SETUP.md §2)
2. حط الفرونت في resources/storefront/   (لازم يكون ماشي على قواعد §2)
3. انسخ src/sitekit-sdk/ من النواة:   php artisan sitekit:sdk:publish resources/storefront/src
4. اكتب src/sitekit-sdk/mappers.ts  وعدّل services/* (سطر لكل دالة)
5. .env الفرونت: VITE_USE_MOCK=false, VITE_API_URL=/api/v1/store
6. php artisan sitekit:storefront:build   ← محلياً للتجربة
7. أدخل المحتوى من الأدمن (الهيرو، الإعدادات، السيارات، العروض)
8. push → التحديثات والنشر عن طريق Actions زي أي عميل
```

---

## 7. قرارات محتاجة منك
1. **مكان الفرونت:** `resources/storefront/` ثابت لكل المشاريع؟ (التوصية: أيوه)
2. **noauf عميل منفصل**، ولا هيحل محل متجر Tameed الحالي (`resources/react`) في نفس المشروع؟
3. **`openapi-typescript`:** موافق نضيفه كـ devDependency عشان أنواع الـ SDK تتولّد أوتوماتيك؟
4. **المقالات:** محتوى منظّم (`content_blocks` زي تصميم noauf)، ولا HTML من محرّر عادي؟
