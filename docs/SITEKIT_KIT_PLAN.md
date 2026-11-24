# خطة Sitekit — باك إند Kit + فرونت لكل مشروع + تحديثات وموديولات

> التاريخ: 2026-11-24 · مبنية على الكود الحالي في `Master`
> الهدف: باك إند واحد (Sitekit) يتركّب لأي معرض. كل مشروع جديد = **فولدر فرونت** (زي `resources/noauf`) + إعدادات. وصاحب المعرض يشوف في الإعدادات إن فيه **تحديث** أو **موديول جديد**، ويثبّته بضغطة، من السيرفر بتاعك أو من ملف **zip**.

---

## ✅ القرار (2026-11-24): GitHub بدل Sitekit Hub في النسخة الأولى

- **الاستضافة:** VPS لكل عميل.
- **التوزيع:** **GitHub** هو الـ Hub.
  - **ريبو أساسي** (upstream) إنت بتنشر منه الإصدارات بـ `Actions ← Sitekit Release`.
  - **ريبو لكل عميل** متعمل كـ clone من الأساسي بنفس تاريخ git.
- **التحديث:** صاحب المعرض بيشوف التحديث في **لوحة التحكم ← تحديثات النظام**، ويضغط تثبيت، فيشتغل `sitekit-update.yml` في ريبو العميل: merge ثم tests ثم push ثم build ثم SSH deploy على الـ VPS (فيه backup وhealth وrollback). وكل خطوة بتتبلّغ للوحة التحكم.
- **النسخة الحالية (Tameed) = v1.0.0** (ملف `VERSION`). بعد مراجعة المنصة كاملة، النواة الأساسية بس هي اللي تترفع لريبو Sitekit الأساسي.
- **دليل الإعداد:** [`docs/SITEKIT_UPDATES_SETUP.md`](SITEKIT_UPDATES_SETUP.md).
- **ده بيحلّ محل** أقسام الـ Hub وحزم الـ zip الموقّعة (4.1 و4.3 و6) في النسخة الأولى. رفع zip والـ Hub المستقل يتأجّلوا لحد ما يبقى فيه عملاء من غير GitHub.

| المرحلة | الحالة |
|---|---|
| 1. التحديثات: VERSION، والفحص من GitHub Releases، وشاشة "تحديثات النظام"، والتثبيت عبر Actions، والـ callbacks، والـ deploy script | ✅ اتعملت (`SystemUpdateController`، `UpdatesPage`، `.github/workflows/sitekit-*.yml`، `.github/sitekit/*.sh`) |
| 2. مسح `deploy-instances.yml` (النشر الأوتوماتيك القديم) | ⏳ محتاج تنفيذ منك |
| 3. فصل النواة عن الموديولات | ⬜ |
| 4. الفرونت (noauf ديناميك + StorefrontController) | ⬜ |
| 5. الموديولات (تثبيت من ريبو موديول عبر نفس الآلية) | ⬜ |

---

## 0. الوضع الحالي (اللي موجود فعلاً)

| الجزء | الموجود | الناقص |
|---|---|---|
| فحص التحديثات | `Services/Updates/UpdateCheckerService` بيقرا manifest من `SITEKIT_MANIFEST_URL`، ولو مش موجود بيرجع **بيانات وهمية** | مفيش سيرفر تحديثات، ولا شاشة في الإعدادات |
| تنفيذ التحديث | `UpgradeService`: backup للداتابيز، وبعده migrate، وبعده clear cache، وبعده health check، وبيسجّل في `UpdateHistory`. وفيه `sitekit:upgrade` و`sitekit:updates-check` و`sitekit:health-check` | **مش بينزّل ملفات أصلاً**. التحديث الوحيد للملفات هو `git pull` في `DeployWebhookController` (shell exec ومحتاج git على السيرفر) |
| الموديولات | `ModuleManager` بيقرا `app/Modules/*/module.json`، و`SitekitModuleServiceProvider` بيسجّل الـ providers، و`sitekit:make-module` بيولّد موديول، وصفحة `/admin/modules` فيها تفعيل/تعطيل بس | `app/Modules` **فاضي**. حالة التفعيل بتتكتب جوّه `module.json` نفسه، فأي تحديث للموديول هيمسحها. مفيش تثبيت من zip، ولا كتالوج، ولا واجهة أدمن للموديول |
| الفصل بين النواة والمشروع | مفيش | السيارات والحجوزات والمدونة كلهم جوّه `app/` مع النواة. مستحيل تحدّث النواة من غير ما تكتب فوق تعديلات العميل |
| الفرونت | المتجر الحالي `resources/react` مربوط بـ Tameed. و`resources/noauf` مستقل، بيانات mock، وكل الطلبات بتعدّي على `src/services/*` | مفيش طريقة قياسية لتركيب فرونت جديد وتقديمه من Laravel. والـ endpoints اللي noauf مستنيها مش متطابقة مع الـ API الحالي |
| الإصدار | `config/sitekit.php` → `'version' => '0.1.0'` (ثابت في الكود) | مفيش ملف `VERSION` بيطلع مع الـ release |

---

## 1. المعمارية المستهدفة

```
┌──────────────────────── Sitekit Hub (سيرفرك) ────────────────────────┐
│ releases (core x.y.z) · modules catalog · clients/licenses · push      │
│ API:  /hub/v1/manifest   /hub/v1/modules   /hub/v1/download/{pkg}     │
└──────────────▲───────────────────────────────▲───────────────────────┘
               │ check / download (license key)  │ push notify (signed webhook)
┌──────────────┴───────── موقع المعرض (Instance) ┴──────────────────────┐
│ core/        ← Sitekit core   (بيتحدّث من الـ Hub — ممنوع تعدّل فيه)     │
│ modules/     ← Catalog, Bookings, Cms, Calculator, ...  (بيتحدّث لوحده) │
│ storefront/  ← فولدر الفرونت بتاع المشروع (noauf) — ملك المشروع         │
│ project/     ← تخصيصات العميل: config, theme, overrides — ملك المشروع   │
│ .env, storage/  ← بيانات — التحديث ميلمسهاش أبداً                         │
└────────────────────────────────────────────────────────────────────────┘
```

**القاعدة الذهبية:** التحديث **بيستبدل** `core/` و`modules/<X>/` بس. أي حاجة تخص العميل (`storefront/` و`project/` و`.env` و`storage/` والداتابيز) مش بتتلمس، والداتابيز مش بتتغيّر غير بـ migrations متوافقة مع اللي قبلها.

---

## 2. المرحلة 1: فصل النواة عن الموديولات (الأساس، ومن غيره مفيش تحديث آمن)

### 2.1 النواة (`sitekit/core`)
تتحوّل لـ composer package داخلي في `packages/sitekit-core`، ومتسجّلة في `composer.json` كـ `path` repository. مكانها في المشروع هيبقى `vendor/sitekit/core` أو `core/` حسب طريقة النشر.

**جوّه النواة:**
- Auth (Employee guard وSanctum وlogin throttling)، RBAC (Spatie وPolicies الأساسية)، الموظفين والأدوار
- Settings (key/value + الكاش) + Branding (`Company` و`CompanyBranding`)
- API envelope (`Http/Api/**`)، الـ middleware، GlobalExceptionHandler
- Media/uploads، الإشعارات، Activity log، Backup
- Modules system + Updates system + Health
- Admin SPA shell: Layout والـ Auth والـ Settings والـ Modules والـ Updates، ومكوّنات `shared/`

### 2.2 الموديولات (`modules/<Name>/`)
نقسم كود Tameed الحالي لموديولات:

| موديول | بيحتوي على |
|---|---|
| `Catalog` | Car, Brand, BrandType, CarModel, CarCategory, CarType, Offer, Specs/Features، و`Api/V1/CatalogSubModuleController`، و`Services/Api/Store/CarApiService` و`CompareApiService` |
| `Sales` | Booking, Lead, Task, ContactSource, BookingWorkflowService, Assignment, Reports, Tracking |
| `Cms` | BlogPost/Category, HomeSection, HeroSlide, PromoBanner/Card, Testimonial, Partner, Faq, SeoEntry |
| `Calculator` | CalculatorBank/Factor/Lead + OTP |
| `WhatsApp` | TwilioWhatsAppService + SendWhatsAppCampaignMessage |

**شكل الموديول:**
```
modules/Catalog/
  module.json            key, name, version, requires.core (^1.2), requires.modules, permissions, admin.entry
  src/CatalogServiceProvider.php   routes + migrations + policies + observers + menu
  database/migrations/
  routes/api.php  routes/store-api.php
  admin/dist/catalog.js   واجهة الأدمن الخاصة بالموديول (bundle جاهز)
  lang/ar, lang/en
```

### 2.3 تعديلات لازمة في الكود الحالي
1. **حالة التفعيل تتنقل لجدول `module_registry`** (الموديل `ModuleRegistry` موجود بالفعل)، بدل ما تتكتب في `module.json`. كده التحديث يستبدل الملفات من غير ما يضيّع التفعيل والإعدادات.
2. **`ModuleManager`:** يدعم `requires.core` و`requires.modules`، ويرفض تفعيل موديول مش متوافق. والـ `install/uninstall` بتشغّل migrations الموديول بس.
3. **الإصدار من ملف `VERSION`** بيتولّد في الـ release، بدل `config('sitekit.version')` الثابت.
4. **صلاحيات جديدة:** `manage-system-updates` و`manage-modules`.

> ⚠️ دي أكبر مرحلة. لازم تتعمل **تدريجياً، موديول ورا موديول**، والاختبارات (223) شغّالة بعد كل خطوة. نبدأ بـ `Calculator` لأنه أصغر وأقل اعتمادية، وبعده `Cms`، وبعده `Catalog`، وآخر حاجة `Sales`.

---

## 3. المرحلة 2: الفرونت لكل مشروع (noauf مثال)

### 3.1 مكان الفرونت وطريقة تقديمه
- كل مشروع ليه **فولدر فرونت واحد**: `storefront/` في جذر المشروع، أو مسار بيتحدّد في `config/sitekit.php`:
  ```php
  'storefront' => [
      'path'  => env('SITEKIT_STOREFRONT_PATH', base_path('storefront')),
      'dist'  => 'dist',          // ناتج vite build
      'mount' => '/',             // المتجر على الجذر، الأدمن على /admin
  ],
  ```
- `sitekit:storefront:build` بيعمل `npm ci && npm run build` جوّه الفولدر، وبعدها بينسخ `dist/` لـ `public/storefront/`.
- `StorefrontController` (عام، بيحلّ محل `StoreSpaController` الخاص بـ Tameed): بيقرا `public/storefront/index.html`، ويحقن **SEO meta** من `SeoEntryResolver` حسب المسار (title وdescription وog وJSON-LD)، ويرجّعه.
  - **ليه من Laravel ومش استضافة منفصلة؟** نفس الـ domain، فمفيش CORS، والـ SEO بيتعمل server-side، ونشر واحد بس.
- noauf بيتبني بـ Vite بتاعه هو، وبالـ `package.json` بتاعه. مفيش دمج مع `vite.config.js` بتاع النواة.

### 3.2 عقد API ثابت للمتجر (Storefront Contract)
الباك إند بيقدّم **API واحد ثابت** لكل الفرونتات: `/api/v1/store/*`، وموثّق بـ Scramble (موجود). وكل فرونت بيكتب **adapter** في `services/` بيحوّل الردود للشكل اللي بيحتاجه.

**التطابق بين noauf والـ API الحالي:**

| noauf بيطلب | الموجود في Sitekit | المطلوب |
|---|---|---|
| `GET /cars` (camelCase، `meta.currentPage`) | `GET /api/v1/store/cars` (`meta.current_page`) | adapter في noauf |
| `GET /cars/latest` | `GET /store/cars?sort=latest&per_page=n` | adapter |
| `GET /cars/:id` | `GET /store/cars/{slug}` | noauf يستخدم slug |
| `GET /offers?tag=` | `GET /store/offers` | إضافة فلتر `tag` في النواة |
| `GET /articles`, `/articles/:slug`, `/related` | `GET /store/blog`, `/store/blog/{slug}` | adapter، وإضافة `related` |
| `GET /brands`, `/partners`, `/testimonials`, `/faqs` | موجودين | adapter بسيط |
| `POST /contact` | `POST /store/contact` | ✅ |
| `POST /finance/leads`, `/finance/requests` | `POST /store/calculator/lead`, `POST /store/booking` | adapter |
| `POST /car-requests` | `POST /store/booking` بـ `booking_type` | adapter |
| النصوص الثابتة (hero، about، contact info، navbar) | `GET /store/settings`, `/store/home`, `/store/about` | تتنقل من `data/content.ts` للـ CMS |

**خطوات تحويل noauf لديناميك:**
1. `.env`: `VITE_USE_MOCK=false` و`VITE_API_URL=/api/v1/store`. مسار نسبي لأنه هيبقى على نفس الـ domain.
2. إعادة كتابة `services/cars.ts` و`content.ts` و`forms.ts` كـ adapters على العقد. **الصفحات مش بتتغيّر.**
3. نقل `data/*.ts` لمحتوى في الأدمن: الصور تترفع من الـ Media، والنصوص من `HomeSection` و`Settings`.
4. استبدال `useApi` بـ TanStack Query، عشان الكاش ومنع تكرار الطلبات.
5. **ضغط الصور:** صور `public/images` الحالية حجمها كبير (`x7.png` لوحدها 3.8 MB). ترفعها من الأدمن فيشتغل عليها `ImageOptimizerService` (WebP).
6. **Branding:** اللوجو والألوان من `GET /store/settings` (موجود `CompanyBranding`)، فنفس الفرونت يشتغل لأكتر من معرض.

### 3.3 قالب مشروع جديد (Checklist)
```
1. انسخ Sitekit (أو composer create-project sitekit/app)
2. ضع فولدر الفرونت في storefront/   (أو اضبط SITEKIT_STOREFRONT_PATH)
3. php artisan sitekit:install        → .env, key, migrate, admin user, modules default
4. php artisan sitekit:module:enable catalog sales cms calculator
5. php artisan sitekit:storefront:build
6. سجّل الـ instance في الـ Hub (license key) → يظهر له التحديثات والموديولات
```

---

## 4. المرحلة 3: نظام التحديثات (صاحب المعرض يشوف "فيه تحديث")

### 4.1 شكل حزمة التحديث (Release Package)
```
sitekit-core-1.3.0.zip
  manifest.json        { type: "core", version: "1.3.0", requires: { php: ">=8.4" }, min_from: "1.0.0",
                         files_sha256: {...}, migrations: [...], changelog: { ar, en }, breaking: false }
  manifest.sig         توقيع Ed25519 على manifest.json
  payload/             core/ + vendor/ (كامل، عشان السيرفرات اللي مفيهاش composer) + public/admin build
```
- **الحزمة بتتبني في GitHub Actions** (توسيع `deploy-instances.yml`): `composer install --no-dev`، ثم `npm run build` للأدمن، ثم zip للمسارات المسموحة بس، ثم توقيع بمفتاح خاص محفوظ كـ secret، ثم رفع للـ Hub.
- **التوقيع:** `sodium_crypto_sign_detached`، والمفتاح العام محفوظ في `config/sitekit.php` جوّه النواة. أي zip **مش موقّع بمفتاحك بيترفض**، حتى لو الأدمن هو اللي رافعه. ده بيمنع رفع كود خبيث من حساب أدمن مخترق. في بيئة `local` بس فيه خيار `allow_unsigned`.

### 4.2 مصادر التحديث (التلات طرق اللي طلبتها)
| الطريقة | إزاي |
|---|---|
| **أوتوماتيك من الـ Hub** | الـ scheduler بيعمل `sitekit:updates-check` كل يوم، وبيسجّل النتيجة في الكاش، فيظهر badge "تحديث متاح" في الأدمن |
| **إنت تبعتله (Push)** | الـ Hub بيبعت webhook موقّع لـ `/api/v1/system/updates/notify`، والموقع بيعمل check فوراً. **مش بيثبّت لوحده** غير لو `auto_install` مفعّل للـ patches |
| **رفع ZIP يدوي** | من الإعدادات، ثم التحديثات، ثم "رفع حزمة". نفس التحقق من التوقيع، وبيشتغل من غير إنترنت |

### 4.3 تدفق التثبيت (Updater)
خطوات بتشتغل في **Job** على الـ queue، والواجهة بتتابع التقدّم بـ polling على `GET /api/v1/system/updates/{id}`:
1. **Preflight:** نسخة PHP، والمساحة، وصلاحيات الكتابة، وتوافق الموديولات المفعّلة مع النسخة الجديدة. ولو فيه موديول مش متوافق، التحديث بيتمنع وبتظهر رسالة.
2. **Verify:** التوقيع، والـ sha256 لكل ملف، والحماية من zip-slip (ممنوع أي مسار فيه `..` أو مسار مطلق).
3. **Backup:** الداتابيز (موجود `backup:run --only-db`) + نسخة من `core/` الحالي في `storage/sitekit/rollback/<from>`.
4. **Maintenance:** `php artisan down --secret=...`، والأدمن يقدر يدخل بالـ secret.
5. **Stage, ثم Swap:** فك الضغط في `storage/sitekit/staging/<to>`، وبعدها **rename ذرّي** للفولدرات. مفيش كتابة فوق الملفات واحد واحد.
6. **Migrate:** `migrate --force`. والـ migrations لازم تكون **متوافقة مع اللي قبلها**: إضافة بس، والمسح يتأجّل لنسخة بعدها.
7. **Clear/Optimize:** `optimize:clear` ثم `optimize`، و`queue:restart`.
8. **Health check:** `HealthCheckService` (موجود) + طلب لـ `/api/v1/health`.
9. **Up**. ولو أي خطوة فشلت، بيحصل **Rollback أوتوماتيك**: يرجّع `core/` القديم، ويرجّع الداتابيز من الـ backup لو الـ migrations اتنفذت.
10. تسجيل كل ده في `UpdateHistory` (موجود)، وإشعار للأدمن.

**يتشال:** `git pull` من `DeployWebhookController`. الـ webhook يبقى "notify" بس، والتثبيت كله يعدّي على الـ Updater.

### 4.4 واجهة صاحب المعرض: الإعدادات ← التحديثات
```
┌ النسخة الحالية: 1.2.4        القناة: stable ▾          [فحص الآن] ┐
│ ● تحديث متاح: 1.3.0  (أمني)                                        │
│   ما الجديد: …changelog بالعربي…                                   │
│   [تثبيت الآن]   [جدولة الليلة 2:00 ص]   [تفاصيل]                   │
├──────────────────────────────────────────────────────────────────┤
│ رفع حزمة يدوياً: [اختر ملف .zip]                                     │
├──────────────────────────────────────────────────────────────────┤
│ السجل: 1.2.3 ← 1.2.4  ✅  2026-11-10  · السجل الكامل · رجوع          │
└──────────────────────────────────────────────────────────────────┘
```
- Badge على "الإعدادات" في الـ sidebar لما يبقى فيه تحديث.
- الـ patch (1.2.x) ممكن يتثبت أوتوماتيك لو المالك وافق. الـ minor والـ major دايماً بموافقته.

**API جديد (Core):**
```
GET    /api/v1/system/updates             status + available + history
POST   /api/v1/system/updates/check
POST   /api/v1/system/updates/install     { version }        → job id
POST   /api/v1/system/updates/upload      multipart zip      → يتحقق ويعرض الـ manifest قبل التثبيت
GET    /api/v1/system/updates/{run}       progress + log
POST   /api/v1/system/updates/{run}/rollback
POST   /api/v1/system/updates/notify      (Hub webhook, signed)
```

---

## 5. المرحلة 4: الموديولات (تظهر عنده في "المعرض"، أو تبعتها، أو zip)

### 5.1 صفحة `/admin/modules` الجديدة (3 تابات)
| التاب | المحتوى |
|---|---|
| **المثبّتة** | الموديولات الموجودة: تفعيل/تعطيل (موجود)، والنسخة، و"تحديث متاح"، وإعدادات الموديول، وإلغاء التثبيت (مع اختيار: الاحتفاظ بالبيانات أو مسحها) |
| **متجر الموديولات** | كتالوج من الـ Hub: الموديولات المتاحة **لترخيص المعرض ده**. اسم، وصف، صور، سعر أو "مجاني"، توافق مع النسخة، زر "تثبيت" |
| **رفع موديول** | رفع `.zip` موقّع، وبعدها يظهر الـ manifest والصلاحيات اللي الموديول هيضيفها، وبعدها "تثبيت" |

### 5.2 "أرفعه بعدين ويظهر عنده"
- إنت بترفع الموديول على الـ Hub مرة واحدة، وبعدها بتختار: **متاح للكل**، أو **لعملاء معينين**، أو **بعد الدفع**.
- الموقع بيسحب الكتالوج مع فحص التحديثات اليومي، أو فوراً لو بعتّ push، والموديول يظهر في التاب.
- **"تبعتهوله":** من الـ Hub تعمل "Assign + Install". بيوصل للموقع webhook، فيظهر للمالك إشعار "موديول جديد جاهز للتثبيت" مع زر موافقة. ولو `auto_install` مفعّل بيتثبّت على طول.

### 5.3 تثبيت موديول (نفس الـ Updater)
Verify (التوقيع + توافق `requires.core` و`requires.modules`)، ثم فك في `modules/<Key>/`، ثم تسجيل في `module_registry`، ثم migrations الموديول، ثم seed الصلاحيات (الأدمن ياخدها تلقائياً)، ثم clear cache، ثم health. ولو فشل: rollback للفولدر والـ migrations.

### 5.4 واجهة الأدمن بتاعة الموديول (من غير ما نعيد build الأدمن)
- الأدمن بيعرض `window.Sitekit = { React, ReactDOM, ReactRouter, queryClient, apiClient, ui }` (المكوّنات من `shared/`).
- كل موديول بيطلع بـ bundle بصيغة ES module، والمكتبات دي **external**، وبيعمل:
  ```ts
  export default { routes: [...], menu: [{ label, icon, path, permission }], settingsTab?, dashboardWidgets? }
  ```
- `GET /api/v1/modules` بيرجّع `admin_entry` لكل موديول مفعّل. والأدمن بيعمل `import(url)` ويسجّل الـ routes والـ menu ديناميك.
- **الموديولات الأساسية** (Catalog وSales وCms) ممكن تفضل جوّه bundle الأدمن الأساسي، وتظهر أو تختفي حسب التفعيل. الـ dynamic loading مطلوب للموديولات اللي بتتضاف **بعد** النشر.

### 5.5 موديول بيأثّر على الفرونت
لو موديول محتاج يظهر في المتجر (مثلاً "حجز تجربة قيادة")، بيضيف endpoints في `/api/v1/store/...`، وبيعلن عن نفسه في `GET /store/settings` → `features: ['test_drive', ...]`. والفرونت بيعرض الجزء ده **بس لو الـ feature موجودة**. ده معناه إن الفرونت لازم يتكتب من الأول على أساس feature flags.

---

## 6. المرحلة 5: Sitekit Hub (سيرفرك)

تطبيق Laravel صغير منفصل. ممكن يتبني بنفس Sitekit كموديول `Hub`.

| الجزء | الوظيفة |
|---|---|
| Clients / Instances | كل معرض: domain، license key، القناة، النسخة الحالية، الموديولات، آخر heartbeat، حالة الصحة |
| Releases | نسخ النواة: stable / beta، وchangelog بالعربي والإنجليزي، وrollout تدريجي (10%، بعدها 50%، بعدها 100%) |
| Modules catalog | الموديولات، ونسخها، والتوافق، والسعر، ومين مسموح له |
| Downloads | رابط تحميل مؤقت (signed URL) بالـ license key |
| Push | زر "ابعت إشعار تحديث" لعميل واحد أو للكل (يحل محل broadcast الحالي في `deploy-instances.yml`) |
| Heartbeat | كل موقع بيبعت مرة في اليوم: النسخة، والموديولات، ونتيجة الـ health. فتشوف لوحة "مين محتاج تحديث ومين فيه مشكلة" |

**أمان:** license key بيتبعت في header، وHTTPS إجباري، وrate limit. الـ webhooks في الاتجاهين بتوقيع HMAC (`SITEKIT_DEPLOY_SECRET` موجود)، ومفيش أي ملفات بتتنزل من غير توقيع Ed25519.

---

## 7. ترتيب التنفيذ والتقدير

| # | المرحلة | الناتج | تقدير |
|---|---|---|---|
| 1 | أساس التحديثات **من غير فصل**: ملف VERSION، و`module_registry` للحالة، وشاشة "التحديثات" في الإعدادات (check + سجل)، والتوقيع والتحقق، ورفع zip للأدمن build بس | صاحب المعرض يشوف "فيه تحديث" | 1–1.5 أسبوع |
| 2 | Sitekit Hub v1: releases + manifest + download + license + heartbeat، وCI بيبني ويوقّع ويرفع | تحديثات حقيقية من سيرفرك | 1.5 أسبوع |
| 3 | Updater كامل: stage، swap، migrate، health، rollback، maintenance، Job + progress | تثبيت بضغطة، مع رجوع آمن لو فشل | 1.5–2 أسبوع |
| 4 | فصل النواة + نقل `Calculator` و`Cms` لموديولات | أول موديولات حقيقية | 2 أسبوع |
| 5 | نقل `Catalog` و`Sales`، و`sitekit:install`، وقالب مشروع جديد | Kit قابل لإعادة الاستخدام | 2–3 أسابيع |
| 6 | الفرونت: `StorefrontController` + build command + ربط noauf (adapters + CMS + branding + الصور) | noauf ديناميك على Sitekit | 1.5–2 أسبوع |
| 7 | الموديولات: كتالوج من الـ Hub، تثبيت/إلغاء، Push، dynamic admin modules، feature flags للفرونت | "تظهر عنده في المعرض" + "ابعتهاله" + zip | 2–3 أسابيع |
| 8 | Hardening: rollout تدريجي، auto-install للـ patches، اختبارات تكامل للتحديث، توثيق | جاهز للإنتاج مع عملاء متعددين | 1 أسبوع |

**الإجمالي التقريبي:** 13–17 أسبوع لمطوّر واحد. المراحل 1 و2 و6 ممكن تتعمل بالتوازي مع 4 و5.

> **أسرع قيمة:** ابدأ بالمراحل **1، 6** (شاشة التحديثات + noauf ديناميك على الـ API الحالي). بعدها **2، 3** (Hub + Updater). وبعدها الفصل والموديولات.

---

## 8. قرارات محتاجة منك

1. **الاستضافة:** المعارض على VPS عندك (فيه shell وcomposer وgit)، ولا shared hosting؟
   - بتحدّد هل الحزمة لازم يبقى فيها `vendor/` كامل (zip أكبر بس شغّال في أي مكان)، ولا `composer install` على السيرفر.
2. **مكان النواة:** `vendor/sitekit/core` (composer package، أنضف) ولا فولدر `core/` (أسهل في التحديث بـ zip). **التوصية: `core/` + autoload في composer.json.**
3. **مكان فولدر الفرونت:** `storefront/` في الجذر، ولا تفضل في `resources/<name>` زي `noauf`؟ التوصية: `storefront/`، والمسار قابل للتغيير من الـ config.
4. **التحديث الأوتوماتيك:** مسموح للـ patches من غير موافقة المالك؟
5. **الموديولات المدفوعة:** محتاج نظام دفع وترخيص لكل موديول، ولا تفعيل يدوي منك من الـ Hub؟
6. **Hub:** سيرفر منفصل (موصى بيه) ولا جوّه نفس مشروع Tameed؟
7. **`Employee` و`User`:** نفضل على `Employee` للأدمن؟ لو العملاء هيعملوا حسابات في المتجر بعدين، `User` يبقى للعملاء.

---

## 9. مخاطر ولازم تتراعى

- **migrations مكسورة بتوقّف التحديث.** مثال موجود فعلاً: `2026_11_19_132935_add_performance_indexes_to_core_tables.php` (الـ `up()` فاضي والـ `down()` بيمسح indexes). لازم قاعدة: كل migration لازم تعدّي `migrate` ثم `rollback` ثم `migrate` في الـ CI.
- **تعديلات على النواة جوّه مشروع عميل** هتضيع مع أول تحديث. أي تخصيص لازم يتعمل من `project/` (config، أو service binding، أو event listeners)، أو كموديول خاص بالعميل.
- **الفصل الكبير** (المرحلة 4 و5) بيلمس الـ namespaces. نستخدم `class_alias` مؤقتاً للـ namespaces القديمة، عشان الـ Blade CRM القديم يفضل شغّال لحد ما يتشال.
- **`storage/framework/views`** متتبّع في git حالياً. لازم يتشال قبل ما نعمل releases.
- **الفرونت ونسخة الـ API:** الفرونت بيعتمد على `/api/v1/store`. أي تغيير بيكسر العقد يروح لـ `/api/v2`، ونسيب v1 لحد ما كل المعارض تتنقل.
