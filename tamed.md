خطة تنفيذ كاملة: Sitekit
نظام Backend داخلي قوي مع Frontend بـ React، قابل لإعادة الاستخدام في أي موقع، ويستقبل التحديثات بأمان
0. الملخص التنفيذي
Sitekit هو "أساس منتج" (Starter Product) داخلي تبني عليه شركتك كل مشروع جديد بدل البدء من الصفر. يتكون من:

Backend مستقل بـ Laravel يوفر المصادقة والصلاحيات والإعدادات والملفات والإشعارات وسجل النشاط ونظام الوحدات (Modules).
Frontend مستقل بـ React + TypeScript يتصل بالـ Backend عبر عقد API موثّق (OpenAPI) وأنواع TypeScript مولّدة تلقائياً.
نظام تحديثات يسمح لكل عميل بالحصول على الإصلاحات والميزات الجديدة دون أن تُفقد بياناته أو تعديلاته الخاصة، مع نسخ احتياطي وإمكانية الرجوع.
الهدف من الخطة: الوصول إلى Sitekit v1.0.0 مستقر، ثم استخدامه كأساس لـ Tameed CRM كأول مشروع حقيقي يُختبر عليه، ثم لبقية المشاريع.

1. الرؤية والنطاق
1.1 ما هو Sitekit؟
أساس مشروع متكامل يُنسخ أو يُثبّت لكل مشروع جديد.
يحتوي على الوظائف المشتركة بين كل المواقع والأنظمة (تسجيل دخول، صلاحيات، إعدادات، رفع ملفات، إشعارات...).
يسمح بإضافة وحدات (Modules) خاصة بكل مشروع دون لمس نواة النظام.
يتلقى تحديثات منظمة تصل إلى كل عميل.
1.2 ما ليس Sitekit؟
ليس منصة SaaS متعددة المستأجرين (Multi-tenant) في الإصدار 1.0. هذا خيار مستقبلي منفصل.
ليس مولّد تصاميم جاهزة للمواقع التسويقية. الواجهة العامة (Landing) تُبنى لكل مشروع على حدة.
ليس بديلاً عن CMS كامل مثل WordPress، لكنه يتضمن وحدة محتوى بسيطة اختيارية.
1.3 المستخدمون
الفئة	الاحتياج
فريقكم (المطورون)	بدء مشروع جديد بسرعة، وكود موحد، وتحديث النواة بسهولة
مدير العميل (Admin)	إدارة المستخدمين والإعدادات، ومعرفة وجود تحديث، وتنفيذه بأمان
مستخدم العميل النهائي	استخدام النظام بسلاسة، والحصول على التحديثات تلقائياً دون فقدان العمل
الزائر (للمواقع العامة)	تصفح سريع وآمن مع SEO جيد
2. القرارات التقنية الأساسية
المجال	الاختيار	السبب
Backend	Laravel (أحدث نسخة LTS أو المستقرة وقت البدء)	نضج، أمان مدمج، نظام حزم قوي
لغة الخادم	PHP 8.3+	دعم الأنواع والأداء
قاعدة البيانات	MySQL 8 أو PostgreSQL (يُحسم في المرحلة 0)	حسب بيئة الاستضافة عند العملاء
المصادقة	Laravel Sanctum (وضع SPA بالكوكيز عند نفس النطاق الجذري، أو Tokens عند اختلافه)	أمان أعلى من تخزين التوكن في المتصفح
الصلاحيات	spatie/laravel-permission	معيار مجرّب، يدعم الأدوار والصلاحيات
سجل النشاط	spatie/laravel-activitylog	تتبع من فعل ماذا ومتى
النسخ الاحتياطي	spatie/laravel-backup	نسخ قبل التحديث وبشكل دوري
توثيق API	Scramble (أو L5-Swagger)	يولّد OpenAPI تلقائياً من الكود
الاختبار (Backend)	Pest + PHPUnit	قراءة سهلة وسرعة
التحليل الثابت	Larastan (PHPStan) + Laravel Pint	جودة الكود وتنسيقه
Frontend	React + TypeScript + Vite	المطلوب، وأداء بناء ممتاز
التوجيه	React Router	معيار مستقر، ويدعم lazy loading
حالة الخادم (Server State)	TanStack Query	تخزين مؤقت وإعادة جلب ومعالجة التحميل والأخطاء
حالة الواجهة	Zustand (عند الحاجة فقط)	خفيف وبسيط
النماذج	React Hook Form + Zod	تحقق موحد وأداء جيد
عميل API	openapi-fetch + أنواع مولّدة من OpenAPI	ربط مباشر مع عقد الـ Backend وأخطاء وقت البناء بدل وقت التشغيل
التصميم	Tailwind CSS + مكونات مملوكة للمشروع (نمط shadcn/ui دون الاعتماد على مكتبة خارجية مغلقة)	تحكم كامل في الهوية
الأيقونات	Lucide React	متسقة وخفيفة
الترجمة و RTL	i18next + react-i18next + خصائص CSS منطقية	دعم العربية كلغة أولى
الاختبار (Frontend)	Vitest + React Testing Library + Playwright للاختبارات الطرفية	تغطية المكونات والمسارات الحرجة
الجودة	ESLint + Prettier + tsc strict	اتساق الكود
الحاويات	Docker Compose للتطوير، وأي خادم لاحقاً	بيئة متطابقة
CI/CD	GitHub Actions (أو ما يناسب فريقكم)	اختبار تلقائي قبل كل دمج
قرار مهم: الـ API يبقى بصيغة snake_case كما هي في Laravel، ويُولَّد الـ TypeScript من OpenAPI مباشرة، لتجنب طبقة تحويل (Mapping) تزيد الأخطاء.

3. نموذج التحديثات (الجزء الأهم في المشروع)
3.1 المشكلة
عندما تُصلح خطأ أو تضيف ميزة في Sitekit، تحتاج أن يصل ذلك إلى كل العملاء دون:

الكتابة فوق تعديلاتهم الخاصة.
فقدان بياناتهم.
كسر مشروعهم.
3.2 الخيارات المدروسة
الخيار	الوصف	المزايا	العيوب	الحكم
A. Git Upstream Merge	كل مشروع Fork من Sitekit ويدمج التحديثات يدوياً	بسيط	تعارضات دائمة، صعب على العملاء غير التقنيين	❌
B. نسخ الكود كاملاً	إرسال ZIP جديد للعميل	سهل التنفيذ	يكسر التعديلات، لا يوجد تتبع	❌
C. النواة كحزم + المشروع كقالب	النواة في Composer/npm، والتخصيص في مجلدات مستقلة	فصل واضح، تحديث بأمر واحد، حماية التعديلات	يتطلب انضباطاً في حدود النواة	✅ الخيار المعتمد
D. تحديث داخلي من لوحة التحكم	زر "تحديث" يعمل داخل التطبيق	تجربة مريحة للعميل	خطر أمني كبير إن لم يكن موقعاً ومعزولاً	⚠️ مرحلة لاحقة بشروط
3.3 النموذج المعتمد (C): الفصل الصارم
text

┌───────────────────────────────────────────────┐
│ النواة (Core) – تُحدَّث من المصدر الرسمي       │
│  • sitekit/core        (Composer package)     │
│  • @sitekit/ui         (npm package)          │
│  • @sitekit/api-client (npm package)          │
└───────────────────────────────────────────────┘
                     ▲ يُستهلك عبر
┌───────────────────────────────────────────────┐
│ طبقة المشروع – مملوكة للعميل/المشروع          │
│  • app/Modules/*      (وحدات خاصة)            │
│  • src/features/*     (صفحات خاصة)            │
│  • config/project.php (إعدادات خاصة)          │
│  • overrides محددة عبر Extension Points       │
└───────────────────────────────────────────────┘
القاعدة الذهبية: لا يُعدَّل كود داخل vendor/ أو داخل @sitekit/*. كل تخصيص يتم عبر:

Service Providers وEvents وHooks في Laravel.
Module Registry وSlots في React.
ملفات الإعدادات في config/project.php.
Theme Tokens لتغيير الهوية.
إذا احتاج المشروع تعديلاً داخل النواة، يُفتح طلب تطوير في Sitekit نفسه، ويُصدَر كإصدار جديد.

3.4 قنوات الإصدار (Release Channels)
stable: للعملاء، إصدارات مختبرة.
beta: لمشاريعكم التجريبية فقط.
security: تصحيحات أمنية عاجلة، تُدفع لكل المشاريع.
3.5 الإصدارات (Semantic Versioning)
MAJOR (2.0.0): تغييرات كاسرة، تتطلب دليل ترقية UPGRADE.md.
MINOR (1.2.0): ميزات جديدة متوافقة مع الخلف.
PATCH (1.2.1): إصلاحات فقط.
سياسة إهمال (Deprecation): أي ميزة تُلغى تبقى تعمل لإصدار MINOR واحد على الأقل مع تحذير.
3.6 تدفق التحديث للمشروع (Backend)
text

1. Sitekit ينشر إصداراً جديداً (Tag + Changelog + UPGRADE.md)
2. بناء الحزم وتوقيعها (Signed Release)
3. نشر manifest.json في مسار التحديثات الرسمي
4. لوحة العميل تفحص الـ manifest (مرة يومياً أو يدوياً)
5. تظهر للمدير إشعار: "يوجد تحديث 1.4.0" مع Changelog وتصنيف (أمني / ميزة / كاسر)
6. المدير (أو فريقكم) يبدأ التحديث:
   أ. التحقق من متطلبات البيئة (PHP, Extensions, Disk)
   ب. نسخ احتياطي تلقائي للقاعدة والملفات
   ج. تفعيل وضع الصيانة (php artisan down)
   د. تحديث الحزم (composer update sitekit/core --with-all-dependencies)
   هـ. تشغيل المهاجرات (migrate --force)
   و. تشغيل خطوات ما بعد التحديث (sitekit:upgrade)
   ز. مسح الكاش وإعادة البناء (config:cache, route:cache, view:cache)
   ح. فحص الصحة (sitekit:health-check)
   ط. إنهاء وضع الصيانة (php artisan up)
7. في حال الفشل: رجوع تلقائي للنسخة السابقة من الكود والقاعدة
8. تسجيل العملية في جدول update_history
3.7 تدفق التحديث للمستخدم النهائي (Frontend)
المشكلة الشائعة في تطبيقات React: المستخدم يفتح تبويباً قديماً، فتفشل الملفات المفهرسة بعد النشر (Chunk Load Error).

الحل:

أثناء البناء يُولَّد ملف version.json بمعرّف فريد للبناء (build hash).
التطبيق يفحص version.json عند التركيز على النافذة، وكل 30 دقيقة.
إذا تغيّر المعرّف تظهر رسالة هادئة: "تم تحديث النظام. أعد التحميل لمتابعة العمل" مع زر، دون إعادة تحميل قسرية.
عند فشل تحميل Chunk بعد نشر جديد، يُعاد تحميل الصفحة تلقائياً مرة واحدة فقط مع حماية من الحلقات المفرغة.
يبقى حفظ المسودات محلياً (في الواجهة) للنماذج الطويلة حتى لا يفقد المستخدم بياناته.
3.8 مستويات التحديث للعملاء
المستوى	الوصف	متى يُستخدم
المستوى 1: إشعار	يعرف المدير بوجود تحديث فقط	الافتراضي للجميع
المستوى 2: تحديث بالأمر	ينفذ فريقكم أو المدير sitekit:upgrade	الإصدارات الكبرى أو المتوسطة
المستوى 3: تحديث من اللوحة	زر واحد مع Queue وBackup وRollback	مرحلة لاحقة بعد اختبار كامل، ولبيئات مُدارة فقط
المستوى 4: مُدار	نحن ننفذ التحديث كخدمة	العملاء الكبار أو غير التقنيين
توصية: الإطلاق بالمستويين 1 و2 فقط. المستوى 3 لا يُفعَّل إلا بعد اجتياز اختبارات الرجوع (Rollback) بنجاح لثلاثة إصدارات متتالية.

3.9 التوقيع والثقة في التحديثات
كل إصدار يُوقَّع بمفتاح Ed25519 (متاح في libsodium المدمج مع PHP).
الـ manifest يتضمن sha256 لكل حزمة وsignature.
النظام يرفض أي حزمة لا يتطابق توقيعها مع المفتاح العام المضمّن في النواة.
المفتاح الخاص محفوظ في مدير أسرار (Secrets Manager) ولا يدخل المستودع أبداً.
3.10 مثال Manifest
JSON

{
  "channel": "stable",
  "version": "1.4.0",
  "released_at": "2026-02-10T09:00:00Z",
  "type": "minor",
  "min_php": "8.3",
  "min_laravel": "12.0",
  "requires_manual_steps": false,
  "changelog_url": "https://updates.example.com/sitekit/1.4.0/CHANGELOG.md",
  "upgrade_guide_url": "https://updates.example.com/sitekit/1.4.0/UPGRADE.md",
  "packages": {
    "composer": "sitekit/core:^1.4",
    "npm": { "@sitekit/ui": "^1.4.0", "@sitekit/api-client": "^1.4.0" }
  },
  "sha256": "9f2c…",
  "signature": "base64-ed25519-signature"
}
4. المعمارية العامة
text

                    ┌──────────────────────────┐
                    │   Browser (React SPA)    │
                    │  • Router  • Query       │
                    │  • Modules Registry      │
                    │  • i18n / RTL / Theme    │
                    └────────────┬─────────────┘
                                 │ HTTPS  (Cookies + XSRF)
                    ┌────────────▼─────────────┐
                    │     Nginx / Reverse      │
                    └────────────┬─────────────┘
                    ┌────────────▼─────────────┐
                    │  Laravel API (/api/v1)   │
                    │  Controllers → Actions   │
                    │  Policies · Resources    │
                    │  Events · Jobs           │
                    └──┬─────────┬─────────┬───┘
                       │         │         │
                 ┌─────▼──┐ ┌────▼───┐ ┌───▼────────┐
                 │  DB    │ │ Redis  │ │ Storage    │
                 │(MySQL/ │ │ Cache  │ │ (local/S3) │
                 │ PgSQL) │ │ Queue  │ │            │
                 └────────┘ └────────┘ └────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │ Update Server (signed    │
                    │ manifests & releases)    │
                    └──────────────────────────┘
5. هيكل المستودعات
5.1 قرار: مستودعات منفصلة مع مستودع قالب
المستودع	المحتوى	الاستخدام
sitekit-core	كود النواة (Laravel package + React packages)	مصدر الحقيقة، تُنشر منه الإصدارات
sitekit-template	مشروع فارغ جاهز يستهلك النواة	يُنسخ عند بدء أي مشروع جديد
tameed-crm	أول مشروع حقيقي	مثال تطبيقي ومرجع
sitekit-docs	التوثيق	اختياري في البداية داخل docs/
5.2 هيكل sitekit-core
text

sitekit-core/
├── backend/                          # يُنشر كـ sitekit/core عبر Composer
│   ├── src/
│   │   ├── Auth/                     # تسجيل الدخول، الخروج، إعادة كلمة المرور
│   │   ├── Users/                    # إدارة المستخدمين
│   │   ├── Rbac/                     # الأدوار والصلاحيات
│   │   ├── Settings/                 # الإعدادات الديناميكية
│   │   ├── Media/                    # رفع الملفات
│   │   ├── Activity/                 # سجل النشاط
│   │   ├── Notifications/            # الإشعارات
│   │   ├── Modules/                  # نظام الوحدات
│   │   ├── Updates/                  # نظام التحديثات
│   │   ├── Health/                   # فحص الصحة
│   │   ├── Support/                  # Responses, Exceptions, Helpers
│   │   └── SitekitServiceProvider.php
│   ├── database/migrations/          # مهاجرات النواة فقط (بادئة sk_ عند الحاجة)
│   ├── routes/api.php
│   ├── config/sitekit.php
│   ├── stubs/                        # قوالب مولّد الوحدات
│   ├── tests/
│   └── composer.json
├── frontend/
│   ├── packages/
│   │   ├── ui/                       # @sitekit/ui: مكونات التصميم
│   │   ├── api-client/               # @sitekit/api-client: عميل الـ API + الأنواع
│   │   ├── i18n/                     # @sitekit/i18n: الترجمة و RTL
│   │   └── core/                     # @sitekit/core: Auth, Layout, Module Registry
│   ├── tokens/                       # tokens.css / tokens.json (الهوية)
│   └── package.json                  # pnpm workspace
├── tools/
│   ├── release/                      # سكربتات بناء وتوقيع الإصدارات
│   └── scaffold/                     # مولّد الوحدات
├── docs/
│   ├── ARCHITECTURE.md
│   ├── CONTRIBUTING.md
│   ├── CHANGELOG.md
│   ├── UPGRADE.md
│   ├── SECURITY.md
│   └── adr/                          # قرارات معمارية موثقة
└── .github/workflows/                # CI + Release
5.3 هيكل sitekit-template (ما يُنسخ لكل مشروع)
text

my-project/
├── backend/                          # تطبيق Laravel
│   ├── app/
│   │   └── Modules/                  # وحدات المشروع الخاصة
│   │       └── Blog/
│   │           ├── Actions/
│   │           ├── Http/Controllers/
│   │           ├── Http/Requests/
│   │           ├── Http/Resources/
│   │           ├── Models/
│   │           ├── Policies/
│   │           ├── Database/migrations/
│   │           ├── Routes/api.php
│   │           ├── Tests/
│   │           ├── BlogServiceProvider.php
│   │           └── module.json
│   ├── config/project.php            # إعدادات المشروع
│   ├── .env.example
│   └── composer.json                 # يتطلب sitekit/core
├── frontend/                         # تطبيق React
│   ├── src/
│   │   ├── app/                      # Providers, Router, Layout
│   │   ├── features/                 # وحدات المشروع (مطابقة لـ Backend Modules)
│   │   │   └── blog/
│   │   │       ├── api/
│   │   │       ├── components/
│   │   │       ├── routes.tsx
│   │   │       ├── locales/{ar,en}.json
│   │   │       └── module.ts
│   │   ├── shared/                   # مساعدات خاصة بالمشروع
│   │   ├── locales/
│   │   └── main.tsx
│   ├── public/
│   ├── .env.example
│   └── package.json                  # يتطلب @sitekit/*
├── docker/
├── docs/                             # توثيق المشروع الخاص
├── .github/workflows/
└── README.md
6. تفاصيل Backend
6.1 الوحدات الأساسية في النواة (Core Modules)
الوحدة	المسؤوليات الرئيسية	الأولوية
Auth	تسجيل الدخول والخروج، استعادة كلمة المرور، تأكيد البريد، تحديد المحاولات، إدارة الجلسات، 2FA (اختياري في الإصدار 1.x)	P0
Users	CRUD للمستخدمين، تفعيل/تعطيل، ملف شخصي، تغيير كلمة المرور	P0
RBAC	أدوار وصلاحيات، مصفوفة صلاحيات، Policies تعتمد عليها	P0
Settings	إعدادات مجمعة ومُنمَّطة (نص، رقم، بوليان، JSON)، مع كاش، وفصل بين إعدادات عامة وخاصة	P0
Media	رفع ملفات بتحقق صارم، أقراص تخزين مختلفة، روابط موقعة للملفات الخاصة	P1
Activity	سجل تغييرات وأحداث أمنية (تسجيل دخول فاشل، تغيير صلاحيات)	P1
Notifications	إشعارات داخل التطبيق + بريد عبر Queue	P1
Modules	تسجيل وتفعيل وتعطيل وحدات المشروع من ملف module.json	P0
Updates	فحص الإصدارات، التحقق من التوقيع، سجل التحديثات	P1
Health	فحص قاعدة البيانات والكاش والـ Queue والمساحة والنسخ الاحتياطي	P1
Content (اختياري)	صفحات بسيطة، روابط، SEO	P2
6.2 جداول قاعدة البيانات الأساسية للنواة
الجدول	الغرض	ملاحظات
users	المستخدمون	أضف is_active, locale, last_login_at
roles, permissions, model_has_roles, ...	RBAC (من Spatie)	لا تُعدَّل بنيتها
settings	الإعدادات	group, key (فريد), type, value, is_public
files	الملفات المرفوعة	disk, path, mime, size, checksum, uploaded_by, visibility
activity_log	سجل النشاط	فهرس على subject وcauser وcreated_at
notifications	إشعارات Laravel	مدمج
update_history	سجل التحديثات	from_version, to_version, status, started_at, finished_at, log
modules_registry	حالة الوحدات	key, version, enabled, installed_at
قواعد قاعدة البيانات:

مفاتيح أجنبية وفهارس على كل foreign key وكل عمود يُفلتر عليه.
softDeletes للبيانات القابلة للاسترجاع فقط.
لا تعديل على جداول النواة من المشروع. الإضافات تكون في جداول خاصة بالمشروع.
كل مهاجرة في النواة تُكتب بشكل Idempotent (تتحقق من وجود العمود قبل الإضافة) حتى تكون آمنة عند إعادة التشغيل.
6.3 تصميم الطبقات (داخل كل وحدة)
text

Request → Route → Middleware → Controller (نحيفة)
                                  ↓
                         Form Request (تحقق)
                                  ↓
                         Action / Service (منطق الأعمال)
                                  ↓
                  Model / Repository (عند الحاجة فقط)
                                  ↓
                         Event → Listener → Job
                                  ↓
                         API Resource (شكل الاستجابة)
قواعد:

Controller لا يحتوي على if تجارية ولا استعلامات معقدة.
كل عملية تكتب على أكثر من جدول تُغلَّف في DB::transaction.
Actions صغيرة، اسمها يعبّر عن فعل واحد: CreateUserAction, AssignRoleAction.
لا Repository إلا إذا ظهرت حاجة فعلية (تجنب التجريد الزائد).
6.4 عقد الـ API
المسار الأساسي: /api/v1

Endpoints النواة المبدئية:

Method	Endpoint	الوصف	المصادقة	الصلاحية
GET	/api/v1/health	حالة النظام	عامة	—
GET	/api/v1/system/info	الإصدار واسم المشروع والإعدادات العامة	عامة	—
GET	/sanctum/csrf-cookie	تهيئة CSRF	عامة	—
POST	/api/v1/auth/login	تسجيل الدخول	عامة	—
POST	/api/v1/auth/logout	الخروج	مسجل	—
GET	/api/v1/auth/me	المستخدم الحالي وصلاحياته	مسجل	—
POST	/api/v1/auth/forgot-password	طلب استعادة	عامة	—
POST	/api/v1/auth/reset-password	تعيين كلمة مرور جديدة	عامة	—
GET	/api/v1/users	قائمة المستخدمين	مسجل	users.view
POST	/api/v1/users	إنشاء مستخدم	مسجل	users.create
GET/PUT/DELETE	/api/v1/users/{id}	تفاصيل/تعديل/حذف	مسجل	users.*
GET	/api/v1/roles	الأدوار	مسجل	roles.view
GET	/api/v1/permissions	الصلاحيات المتاحة	مسجل	roles.view
GET/PUT	/api/v1/settings	الإعدادات	مسجل	settings.view / settings.update
POST	/api/v1/media	رفع ملف	مسجل	media.upload
GET	/api/v1/activity	سجل النشاط	مسجل	activity.view
GET	/api/v1/notifications	إشعارات المستخدم	مسجل	—
POST	/api/v1/notifications/{id}/read	تعليم كمقروء	مسجل	—
GET	/api/v1/updates/status	حالة التحديثات	مسجل	system.updates
6.5 شكل الاستجابة الموحد
نجاح (قائمة مُرقَّمة):

JSON

{
  "data": [
    { "id": 1, "name": "Ahmed", "is_active": true, "created_at": "2026-01-10T10:00:00Z" }
  ],
  "meta": { "current_page": 1, "last_page": 4, "per_page": 15, "total": 52 },
  "links": { "first": "...", "last": "...", "prev": null, "next": "..." }
}
خطأ تحقق (422):

JSON

{
  "message": "Validation failed.",
  "code": "validation_error",
  "errors": { "email": ["البريد الإلكتروني مستخدم مسبقاً."] }
}
أخطاء أخرى: 401 unauthenticated، 403 forbidden، 404 not_found، 429 too_many_requests، 500 server_error (بدون تفاصيل داخلية في الإنتاج).

Request ID: كل استجابة تحمل X-Request-Id لتسهيل تتبع الأخطاء بين الواجهة والسجلات.

6.6 Exception Handling موحد
معالج مركزي في bootstrap/app.php يحوّل كل الاستثناءات إلى الشكل الموحد أعلاه عندما يكون الطلب api/*.
تسجيل الأخطاء الداخلية في logs مع request_id وuser_id، دون تسجيل كلمات مرور أو توكنز أو بيانات حساسة (تُفلتر عبر قائمة $dontFlash وتنقيح الحقول).
6.7 نظام الوحدات (Module System) في Backend
ملف module.json لكل وحدة:

JSON

{
  "key": "blog",
  "name": "Blog",
  "version": "1.0.0",
  "enabled": true,
  "provider": "App\\Modules\\Blog\\BlogServiceProvider",
  "permissions": ["blog.view", "blog.create", "blog.update", "blog.delete"],
  "dependencies": ["sitekit/core:^1.0"]
}
قواعد الوحدة:

تُحمَّل عبر ServiceProvider واحد يسجّل: Routes، Migrations، Policies، Permissions، Listeners.
تعطيل الوحدة يوقف مساراتها دون حذف بياناتها.
الوحدة لا تستطيع تعديل جداول النواة مباشرة، بل تستمع لـ Events أو تستخدم Actions منشورة من النواة.
مولّد الوحدات:

Bash

php artisan sitekit:make-module Blog --crud
ينشئ الهيكل والـ Routes والـ Controller والـ Resource والـ Request والـ Policy واختبارات CRUD الأساسية، وينشئ على الواجهة مجلد features/blog بنفس الشكل.

6.8 الأمان في Backend (مختصر، التفاصيل في القسم 10)
Sanctum SPA مع SESSION_SECURE_COOKIE=true في الإنتاج وSameSite=Lax.
Rate Limiting: login (5 محاولات/دقيقة لكل IP+بريد)، api (عام)، uploads (أكثر تشدداً).
Policies لكل Model، ولا اعتماد على إخفاء الأزرار في الواجهة.
Mass Assignment محمي بـ $fillable صريح أو Form Requests مع validated().
7. تفاصيل Frontend
7.1 الهيكل التفصيلي
text

frontend/src/
├── app/
│   ├── providers/            # QueryClientProvider, I18nProvider, ThemeProvider, AuthProvider
│   ├── router/               # تعريف المسارات والحماية (ProtectedRoute)
│   ├── layouts/              # AppLayout, AuthLayout, PublicLayout
│   ├── error/                # ErrorBoundary, NotFound, ServerError
│   └── App.tsx
├── features/                 # مطابقة لوحدات الـ Backend
│   ├── auth/
│   ├── dashboard/
│   ├── users/
│   ├── roles/
│   ├── settings/
│   ├── activity/
│   ├── notifications/
│   ├── updates/
│   └── [project-modules]/
├── shared/
│   ├── api/                  # عميل API المولّد + Hooks عامة
│   ├── hooks/
│   ├── utils/
│   └── types/
├── locales/
│   ├── ar/
│   └── en/
└── main.tsx
7.2 قاعدة الفصل بين الطبقات
UI (Components): لا تستدعي fetch مباشرة أبداً.
Hooks (features/*/api): تغلّف استدعاءات TanStack Query.
API Client: مصدر واحد، مولّد من OpenAPI.
Pages: تجمع الـ Hooks والمكونات فقط.
7.3 عميل API (مثال مبسّط)
TypeScript

// packages/api-client/src/client.ts
import createClient from 'openapi-fetch';
import type { paths } from './generated/schema';
import { getCookie } from './cookies';

export const api = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_URL,
  credentials: 'include',
});

api.use({
  onRequest({ request }) {
    request.headers.set('Accept', 'application/json');
    request.headers.set('Accept-Language', getCurrentLocale());
    const xsrf = getCookie('XSRF-TOKEN');
    if (xsrf) request.headers.set('X-XSRF-TOKEN', decodeURIComponent(xsrf));
    return request;
  },
  onResponse({ response }) {
    if (response.status === 401) {
      // إرسال حدث عام لإنهاء الجلسة وتوجيه المستخدم لصفحة الدخول
      window.dispatchEvent(new CustomEvent('sitekit:unauthorized'));
    }
    return response;
  },
});
7.4 Hook مثال باستخدام TanStack Query
TypeScript

// features/users/api/useUsers.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api/client';

export function useUsers(params: { page: number; search?: string }) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/users', { params: { query: params } });
      if (error) throw error;
      return data;
    },
    placeholderData: (prev) => prev, // تجربة تنقل سلسة بين الصفحات
  });
}
7.5 تدفق المصادقة في الواجهة
عند فتح التطبيق: GET /auth/me.
إن نجح: تُحمَّل بيانات المستخدم والصلاحيات في AuthProvider.
إن فشل بـ 401: توجيه إلى /login مع حفظ المسار المطلوب.
بعد الدخول: GET /sanctum/csrf-cookie ثم POST /auth/login.
عند sitekit:unauthorized: تنظيف الكاش (queryClient.clear()) والتوجيه لصفحة الدخول.
لا تُخزَّن التوكنز أو بيانات حساسة في localStorage.
7.6 Route Guards والصلاحيات
React

<Route element={<RequireAuth />}>
  <Route element={<RequirePermission permission="users.view" />}>
    <Route path="/users" element={<UsersPage />} />
  </Route>
</Route>
الصلاحيات تأتي من /auth/me. الإخفاء في الواجهة تجربة مستخدم فقط، والحماية الحقيقية في Policies في الـ Backend.

7.7 نظام الوحدات في Frontend (Module Registry)
TypeScript

// features/blog/module.ts
import { defineModule } from '@sitekit/core';

export default defineModule({
  key: 'blog',
  version: '1.0.0',
  routes: [
    { path: '/blog', lazy: () => import('./routes') },
  ],
  navigation: [
    {
      labelKey: 'nav.blog',          // مفتاح ترجمة
      icon: 'Newspaper',             // من Lucide
      permission: 'blog.view',
      group: 'content',
      order: 40,
    },
  ],
  widgets: [],                       // widgets للداشبورد (اختياري)
});
الـ Layout يقرأ كل الوحدات المسجلة، ويبني القائمة الجانبية بالترتيب والمجموعات والصلاحيات، ويحمّل كل وحدة بشكل Lazy.

7.8 نظام التصميم (Design System) داخل @sitekit/ui
المكونات:

الأزرار: Primary, Secondary, Outline, Ghost, Danger, Icon.
الحقول: Input, Textarea, Select, Combobox, DatePicker, Switch, Checkbox, Radio, FileUpload.
البيانات: DataTable (بحث، فلترة، ترتيب، صفحات، إجراءات الصف، حالات التحميل والفراغ والخطأ)، Card, KPI Card, StatCard, EmptyState, Skeleton.
التنقل: Sidebar, Header, Breadcrumbs, Tabs, Pagination.
التغذية الراجعة: Toast, Alert, Badge, Dialog/Modal, Drawer, Tooltip, Dropdown.
النماذج: FormField (label + help + error) متكامل مع React Hook Form وZod.
Tokens: كل الألوان والمسافات والخطوط والظلال والأنصاف في tokens.json، تُولَّد منه متغيرات CSS. تغيير الهوية لعميل جديد = تغيير ملف واحد.

قاعدة: لا تُكتب قيم ألوان (#hex) داخل المكونات. يُفحص ذلك في CI بسكربت بسيط أو قاعدة ESLint مخصصة.

7.9 الترجمة و RTL
المفاتيح بنمط module.section.key مثل users.form.email.
ملفات ar.json وen.json لكل وحدة، تُدمج تلقائياً.
عند تغيير اللغة: تحديث dir وlang على <html>، وإعادة تحميل الخطوط (IBM Plex Sans Arabic للعربية، Inter للإنجليزية).
استخدام خصائص منطقية: margin-inline-start, padding-inline-end, inset-inline-start. ممنوع left/right في المكونات المشتركة.
الأرقام والتواريخ عبر Intl.NumberFormat وIntl.DateTimeFormat مع اللغة الحالية.
7.10 إدارة الحالة
نوع البيانات	الأداة
بيانات من الخادم	TanStack Query
حالة المستخدم والصلاحيات	AuthProvider (Context) أو Zustand
حالة واجهة عامة (سايدبار مفتوح، ثيم)	Zustand أو Context
حالة نموذج	React Hook Form
URL state (فلاتر، صفحة، بحث)	search params في React Router
7.11 الأداء في Frontend
Route-level code splitting عبر lazy() لكل وحدة.
Virtualization للجداول الكبيرة (TanStack Virtual) عند تجاوز ~500 صف.
Debounce على البحث (300ms).
Prefetch للصفحة التالية في Pagination.
تحميل الخطوط بـ font-display: swap وتحميل الأوزان المستخدمة فقط.
تحديد حجم الـ bundle في CI (مثلاً حد أقصى للـ initial JS).
7.12 Error Boundaries
Boundary عام على مستوى التطبيق (صفحة خطأ عامة).
Boundary على مستوى كل Layout وكل Module، حتى لا يتعطل النظام كله بسبب وحدة واحدة.
تسجيل الأخطاء الأمامية (اختيارياً) عبر خدمة مثل Sentry مع إزالة البيانات الشخصية.
8. ربط Frontend بـ Backend (Contract-First)
هذا الجزء يحقق طلبك الأساسي: الربط المباشر بين الواجهة والخادم دون تخمين.

8.1 الفكرة
Laravel يولّد OpenAPI تلقائياً من الـ Routes والـ Resources والـ Form Requests (عبر Scramble).
أمر CI يحفظ ملف openapi.json ويتحقق من تطابقه مع الإصدار المُعتمد.
openapi-typescript يولّد schema.d.ts من الملف.
openapi-fetch يستخدم هذه الأنواع: أي اختلاف في اسم حقل أو نوعه يُكتشف عند tsc، قبل وصوله للمستخدم.
8.2 سكربت التوليد
Bash

# من جذر المشروع
php backend/artisan scramble:export --path=backend/storage/openapi.json
npx openapi-typescript backend/storage/openapi.json -o frontend/src/shared/api/schema.d.ts
8.3 قواعد العقد
أي تغيير في شكل الاستجابة يتطلب تحديث openapi.json في نفس الـ Pull Request.
CI يفشل إذا تغيّر الـ OpenAPI بدون تحديث الإصدار (Breaking Change Detection باستخدام أداة مثل oasdiff).
كل Endpoint جديد يجب أن يحتوي على: وصف، أمثلة، أكواد الأخطاء المتوقعة.
8.4 مخطط تدفق التغيير
text

تعديل Backend → تشغيل export → تحديث schema.d.ts → tsc يكشف الكسر → تحديث الواجهة → اختبار
9. تفاصيل نظام التحديثات (التنفيذ)
9.1 الأوامر
الأمر	الوظيفة
php artisan sitekit:version	عرض الإصدار الحالي وقنوات التحديث
php artisan sitekit:updates:check	فحص الـ manifest وعرض التحديث المتاح
php artisan sitekit:upgrade	تنفيذ خطوات ما بعد التحديث (Migrations، Permissions، Config merge، Cache)
php artisan sitekit:upgrade --dry-run	محاكاة بدون تنفيذ
php artisan sitekit:rollback	الرجوع لنسخة الاحتياط الأخيرة
php artisan sitekit:health-check	فحص شامل بعد التحديث
ملاحظة مهمة: استبدال الكود (Composer/npm) يتم عبر خط النشر (Deploy) أو عبر الأوامر المعتمدة، وsitekit:upgrade يتولى الخطوات بعد الكود الجديد. هذا يفصل المسؤوليات ويقلل المخاطر.

9.2 هيكل sitekit:upgrade (مختصر)
PHP

public function handle(UpgradeService $upgrade): int
{
    $from = config('sitekit.version');
    $to   = $upgrade->targetVersion();          // من composer / manifest

    $this->components->info("الترقية من {$from} إلى {$to}");

    if (! $upgrade->checkRequirements($this)) {  // PHP, extensions, disk
        return self::FAILURE;
    }

    if ($this->option('dry-run')) {
        return $upgrade->preview($this);
    }

    $record = $upgrade->start($from, $to);       // update_history: running

    try {
        $this->call('backup:run', ['--only-db' => true]);
        Artisan::call('down', ['--retry' => 60]);

        $this->call('migrate', ['--force' => true]);
        $upgrade->mergeConfigDefaults();          // إضافة مفاتيح جديدة دون لمس القيم الحالية
        $upgrade->syncPermissions();              // إضافة صلاحيات جديدة
        $upgrade->runPostUpgradeSteps($to);       // خطوات خاصة بالإصدار

        $this->call('optimize:clear');
        $this->call('config:cache');
        $this->call('route:cache');

        $this->call('sitekit:health-check');

        $upgrade->finish($record, 'success');
        return self::SUCCESS;
    } catch (Throwable $e) {
        $upgrade->finish($record, 'failed', $e);
        $this->components->error('فشلت الترقية. راجع: sitekit:rollback');
        return self::FAILURE;
    } finally {
        Artisan::call('up');
    }
}
9.3 سياسة الهجرات (Migrations) في التحديثات
كل مهاجرة تُكتب آمنة: إضافة أعمدة بقيم افتراضية، لا حذف مباشر في الإصدار نفسه.
الحذف يتم بعد إصدارين عبر Migration منفصلة ("cleanup").
كل إصدار MAJOR يتضمن UPGRADE.md يشرح الخطوات اليدوية إن وُجدت.
requires_manual_steps: true في الـ manifest يمنع التحديث الآلي ويطلب تدخلاً بشرياً.
9.4 الرجوع (Rollback)
قبل كل ترقية: نسخة من قاعدة البيانات ونسخة من الكود (Git tag أو أرشيف مؤرخ) ومعرّف الإصدار السابق.
sitekit:rollback يعيد الكود للإصدار السابق ويستعيد القاعدة من النسخة ويسجل العملية.
الاختبار: كل إصدار يُختبر فيه الرجوع في بيئة Staging قبل النشر.
9.5 لوحة التحديثات في الواجهة (مستوى 1)
صفحة Updates: الإصدار الحالي، الإصدار المتاح، نوعه (أمني/ميزة/كاسر)، ملخص الـ Changelog، رابط التفاصيل.
شارة تنبيه صغيرة في الهيدر عند وجود تحديث أمني.
الصلاحية: system.updates فقط.
الزر "تحديث الآن" غير مفعّل في الإطلاق الأول، ويظهر تعليمات الأمر أو رابط التواصل مع الدعم.
9.6 قنوات الإصدار والـ Staging
كل مشروع يحدد القناة (stable افتراضياً) في .env: SITEKIT_UPDATE_CHANNEL=stable.
تحديث Staging أولاً، ثم Production بعد يوم أو يومين من الاختبار.
10. الأمان (Security Baseline)
10.1 المصادقة والجلسات
Sanctum SPA (كوكيز HttpOnly) عند نفس النطاق الجذري.
تجديد معرّف الجلسة بعد تسجيل الدخول (session()->regenerate()).
انتهاء الجلسة بعد فترة خمول قابلة للإعداد.
قفل الحساب مؤقتاً بعد محاولات فاشلة متكررة مع إشعار للمستخدم.
كلمات المرور: Password::defaults() بطول 10+ ومع فحص تسريبات (uncompromised()).
2FA عبر TOTP كميزة اختيارية في الإصدار 1.1.
10.2 التفويض (Authorization)
Policies لكل Model مع تسجيلها في ServiceProvider.
Middleware permission: على الـ Routes، مع Policies داخل Actions الحساسة.
اختبار آلي: كل Endpoint محمي يُختبر بحالة 401 و403 و200.
10.3 حماية الإدخال والمخرجات
Form Requests لكل عملية كتابة، بدون استخدام $request->all().
React يحمي من XSS افتراضياً، ممنوع dangerouslySetInnerHTML إلا بعد تنظيف عبر DOMPurify.
Eloquent يحمي من SQL Injection عند استخدام Query Builder بشكل صحيح، وممنوع تمرير مدخلات خام إلى whereRaw.
10.4 رفع الملفات
التحقق من MIME الحقيقي (finfo) وليس الامتداد فقط.
حد أقصى للحجم، وقائمة بيضاء للأنواع.
أسماء ملفات عشوائية (UUID)، لا تُستخدم أسماء المستخدم.
الملفات الخاصة تُخزَّن خارج public وتُقدَّم عبر روابط موقعة مؤقتة.
لا تنفيذ لأي ملف مرفوع (منع .php في مجلدات الرفع في Nginx).
10.5 الهيدرز والإعدادات
Content-Security-Policy، X-Content-Type-Options: nosniff، Referrer-Policy: strict-origin-when-cross-origin، Strict-Transport-Security.
CORS محدد بالنطاقات المسموحة فقط، لا * مع الكوكيز.
APP_DEBUG=false في الإنتاج، وصفحات الخطأ عامة.
لا تُعرض Stack Traces أو معلومات الإصدار الدقيقة للزوار.
10.6 الأسرار
.env خارج المستودع، .env.example بدون قيم حساسة.
مفتاح التوقيع للتحديثات في مدير أسرار (GitHub Secrets أو Vault).
Pre-commit hook بسكربت مثل gitleaks لمنع رفع الأسرار.
10.7 السجلات
لا تُسجَّل كلمات المرور، التوكنز، أرقام البطاقات، أو البيانات الشخصية الكاملة.
سجلات أمنية منفصلة: تسجيل الدخول، تغيير الصلاحيات، تنزيل الملفات الخاصة.
10.8 الاعتماديات
composer audit وnpm audit --omit=dev في CI.
Dependabot أو Renovate للتحديثات المنتظمة.
قائمة الاعتماديات المسموحة في docs/CONTRIBUTING.md، ولا إضافة حزمة جديدة بدون مراجعة.
10.9 Rate Limiting
المسار	الحد
/auth/login	5/دقيقة لكل IP+بريد
/auth/forgot-password	3/دقيقة
/media (رفع)	20/دقيقة للمستخدم
/api/* (عام)	120/دقيقة للمستخدم
11. الأداء
11.1 Backend
Eager Loading لكل علاقة تُعرض في قائمة (منع N+1)، ومراقبة عبر Laravel Debugbar في التطوير أو Telescope.
Model::preventLazyLoading(! app()->isProduction()) في بيئة التطوير.
كاش للإعدادات والصلاحيات والمعلومات العامة مع إبطال واضح عند التعديل.
Queue للإشعارات والبريد والتصدير والمهام الثقيلة (Redis + Horizon عند الحاجة).
فهارس على الأعمدة المستخدمة في الفلترة والفرز.
Pagination إلزامي لكل القوائم، والحد الأقصى per_page = 100.
optimize وconfig:cache وroute:cache وview:cache في الإنتاج.
إمكانية الانتقال لـ Laravel Octane لاحقاً للمشاريع عالية الحمل.
11.2 Frontend
Code splitting على مستوى الصفحة والوحدة.
Cache في TanStack Query بقيم staleTime مناسبة (مثلاً 30 ثانية للقوائم، 5 دقائق للإعدادات).
تقليل إعادة الرسم: memo للمكونات الثقيلة فقط بعد القياس، لا بشكل عشوائي.
صور: WebP/AVIF، loading="lazy"، أبعاد محددة لمنع Layout Shift.
Bundle Analyzer في CI مع حد أقصى.
11.3 البنية التحتية
Nginx مع Gzip/Brotli وCache للأصول المفهرسة (immutable).
Redis للكاش والجلسات والـ Queue في الإنتاج.
12. الاختبار وضمان الجودة
12.1 هرم الاختبار
المستوى	الأداة	النسبة التقريبية	المحتوى
وحدات (Unit)	Pest / Vitest	50%	Actions، Helpers، Hooks، Utils
تكامل (Integration/Feature)	Pest (HTTP) / RTL	35%	Endpoints، Policies، مكونات مع API وهمي
طرفي (E2E)	Playwright	15%	تسجيل الدخول، CRUD المستخدمين، التحديثات
12.2 اختبارات Backend الإلزامية
كل Endpoint: نجاح، تحقق فاشل (422)، بدون مصادقة (401)، بدون صلاحية (403)، غير موجود (404).
Migrations: تشغيل من الصفر، وتشغيل على قاعدة بها بيانات (تحديث).
Upgrade: اختبار sitekit:upgrade على نسخة قديمة من الـ Schema.
Rollback: اختبار الاستعادة بعد ترقية فاشلة مُحاكاة.
توقيع التحديثات: رفض حزمة بتوقيع خاطئ، وقبول الصحيح.
12.3 اختبارات Frontend الإلزامية
صفحة الدخول: نجاح، فشل بيانات، فشل شبكة، إعادة توجيه.
DataTable: بحث، صفحات، حالة فارغة، حالة خطأ.
نماذج: التحقق من الرسائل بالعربية والإنجليزية.
RTL: اختبار لقطات (Snapshot) أو مراجعة بصرية للمكونات الأساسية في الاتجاهين.
Route Guards: منع الوصول بدون صلاحية.
12.4 اختبار الاتصال Frontend ↔ Backend
اختبار عقد (Contract Test): التحقق من أن الـ OpenAPI المتولَّد يطابق الأنواع المستخدمة في الواجهة.
اختبار E2E يشغّل Backend حقيقي وقاعدة اختبار (SQLite أو Docker DB).
12.5 الجودة الآلية
pint --test, phpstan analyse (مستوى 6 كحد أدنى، ويُرفع تدريجياً), pest --parallel.
eslint, prettier --check, tsc --noEmit بوضع strict.
فحص الحزم والحجم والأمان.
13. CI/CD ومسار النشر
13.1 Pipeline لكل Pull Request
text

lint (php + js) → static analysis → tests (backend) → tests (frontend)
→ openapi export & diff → build frontend → audit (composer/npm)
→ E2E (على PR الهام فقط) → تقرير
13.2 Pipeline للإصدار (Release)
text

Tag vX.Y.Z → كل الاختبارات → بناء الحزم → توليد CHANGELOG و manifest
→ توقيع الحزم → رفع للمستودع الخاص (Composer/npm) → تحديث update server
→ إشعار القناة
13.3 البيئات
البيئة	الغرض	قاعدة البيانات
local	التطوير	Docker (MySQL/PgSQL) أو SQLite للاختبار
testing	الاختبارات الآلية	قاعدة مؤقتة تُعاد في كل تشغيل
staging	مراجعة قبل الإنتاج، واختبار التحديثات	نسخة مُنقّاة من الإنتاج (بدون بيانات حساسة حقيقية)
production	العملاء	نسخ يومية مع احتفاظ 14 يوماً
13.4 Docker Compose للتطوير
YAML

services:
  app:      # PHP-FPM 8.3 + Composer
  web:      # Nginx
  db:       # MySQL 8 أو PostgreSQL 16
  redis:    # Redis 7
  node:     # Vite dev server
  mailpit:  # اختبار البريد محلياً
13.5 النشر
خادم بمسارات إصدار (releases/، current symlink)، ونشر بدون توقف (Zero-downtime) عبر Deployer أو سكربت مخصص.
كل نشر يمر بـ: بناء ← نسخ ← migrate ← تبديل الـ symlink ← health check ← تنظيف الإصدارات القديمة (الاحتفاظ بـ 3).
14. التوثيق
الملف	المحتوى	المسؤول
README.md	ما هو Sitekit، التشغيل السريع، الروابط	الكل
docs/ARCHITECTURE.md	المعمارية، الطبقات، تدفق البيانات، الوحدات	Lead
docs/CONTRIBUTING.md	معايير الكود، الفروع، Commits، المراجعة	Lead
docs/CHANGELOG.md	كل إصدار وتغييراته	تلقائي من Commits
docs/UPGRADE.md	خطوات الترقية بين الإصدارات الكبرى	Backend + Frontend
docs/SECURITY.md	الإبلاغ عن الثغرات، سياسة الدعم	Lead
docs/adr/	قرارات معمارية مؤرخة (ADR)	الكل
docs/API.md	رابط OpenAPI وأمثلة	Backend
docs/MODULES.md	كيفية إنشاء وحدة جديدة	Backend + Frontend
docs/DESIGN_SYSTEM.md	المكونات والـ Tokens وقواعد الاستخدام	Frontend / Design
docs/DEPLOYMENT.md	النشر والبيئات والنسخ الاحتياطي	DevOps
docs/RUNBOOK.md	إجراءات الطوارئ (الرجوع، إعادة التشغيل، الاستعادة)	DevOps
قاعدة: أي Pull Request يغيّر سلوكاً يجب أن يحدّث التوثيق المعني، وإلا لا يُدمج.

15. خطة التنفيذ بالمراحل
الافتراضات: فريق من مطورَين (Backend وFrontend) بدوام كامل، مع مراجعة معمارية منتظمة. التقدير قابل للتعديل بعد Phase 0.

المرحلة 0: القرارات والاكتشاف (أسبوع واحد)
الأهداف: حسم الأسئلة المفتوحة (انظر القسم 18).
المهام:

اجتماع قرارات، توثيق القرارات في ADR.
اختيار قاعدة البيانات، نطاق النشر، نموذج الترخيص.
مراجعة Tameed CRM الحالي (من خطة التدقيق السابقة) لتحديد ما سيُنقل إلى Sitekit.
تحديد أول 3 مشاريع ستستخدم Sitekit.
المخرجات: docs/adr/0001…0008، ومستند نطاق v1.0.
معيار الإنهاء: توقيع المالك على النطاق وقائمة الأسئلة.

المرحلة 1: الأساس (أسبوعان)
المهام:

إنشاء sitekit-core وsitekit-template.
إعداد Laravel (أحدث نسخة مستقرة) مع Pint وLarastan وPest.
إعداد React + Vite + TypeScript strict + ESLint + Prettier.
Docker Compose للتطوير.
CI أساسي: lint، tests، build، audit.
Tokens الهوية الأساسية (الألوان، الخطوط، المسافات) وربط الخطوط العربية والإنجليزية.
هيكل المجلدات الكامل كما في القسم 5.
المخرجات: مشروع فارغ يعمل محلياً، وCI أخضر.
معيار الإنهاء: docker compose up يشغّل الـ Backend والـ Frontend، وصفحة "Hello" تستدعي /api/v1/health بنجاح.

المرحلة 2: المصادقة والمستخدمون والصلاحيات (3 أسابيع)
Backend:

Sanctum SPA، Login/Logout/Me، استعادة كلمة المرور، Rate Limiting.
Users CRUD مع Policies، Roles/Permissions مع Spatie.
Seeder للأدوار الافتراضية (Super Admin, Admin, Manager, Staff).
Activity Log لأحداث الأمان.
اختبارات كاملة (200/401/403/404/422).
Frontend:

صفحات الدخول واستعادة كلمة المرور.
AuthProvider، RequireAuth، RequirePermission.
صفحة المستخدمين (جدول، بحث، إنشاء، تعديل، تعطيل).
صفحة الأدوار والصلاحيات (مصفوفة).
المخرجات: نظام دخول وصلاحيات كامل.
معيار الإنهاء: كل سيناريوهات المصادقة والصلاحيات تمر في الاختبارات الآلية، وتجربة يدوية على الموبايل والديسكتوب.

المرحلة 3: مكونات النواة (أسبوعان ونصف)
Backend: Settings (مع كاش)، Media (رفع آمن)، Notifications (داخل التطبيق + بريد عبر Queue)، Health Check.
Frontend:

@sitekit/ui كاملاً (المكونات والحالات في القسم 7.8).
صفحة الإعدادات، مركز الإشعارات، مكون رفع الملفات.
Layout كامل: Sidebar قابل للطي، Header، Breadcrumbs، Drawer للموبايل.
لوحة الداشبورد الأساسية (Widgets بسيطة من بيانات حقيقية فقط).
المخرجات: مكتبة مكونات موثقة وتطبيق قابل للاستخدام.
معيار الإنهاء: كل مكون له صفحة عرض (Playground) في وضعي RTL وLTR، وتصميم متجاوب بدون Overflow أفقي.

المرحلة 4: نظام الوحدات والمولّد والعقد (أسبوعان)
المهام:

Module Registry في Backend (module.json، ServiceProvider، تفعيل وتعطيل).
Module Registry في Frontend (defineModule، Navigation ديناميكي، Lazy routes).
sitekit:make-module مع Stubs للـ Backend والـ Frontend.
تكامل Scramble + openapi-typescript + openapi-fetch، وCI لفحص الكسر (oasdiff).
Widgets Registry للداشبورد.
المخرجات: إنشاء وحدة جديدة في أقل من 10 دقائق بأمر واحد.
معيار الإنهاء: وحدة تجريبية "Notes" تُنشأ بالمولّد وتعمل Backend وFrontend وتُعطَّل دون كسر النظام.

المرحلة 5: نظام التحديثات (ثلاثة أسابيع)
المهام:

update_history وmodules_registry، ومنطق Versions.
sitekit:version، sitekit:updates:check، sitekit:upgrade (مع --dry-run)، sitekit:rollback.
بناء الإصدارات وتوقيعها (Ed25519) وتوليد manifest.
Update Server بسيط (مجلد ثابت أو S3 مع HTTPS) يستضيف manifests وCHANGELOG.
صفحة Updates في الواجهة (مستوى 1).
version.json في الواجهة وإشعار التحديث بدون إعادة تحميل قسرية، وإعادة تحميل تلقائية عند فشل Chunk.
اختبارات: توقيع، ترقية ناجحة، ترقية فاشلة مع Rollback، ترقية بين إصدارين متتاليين.
المخرجات: إصدار تجريبي 1.0.1 يُنشر ويُثبَّت على Staging بنجاح، ثم يُرجَع عمداً ويعود سليماً.
معيار الإنهاء: ترقية وRollback ناجحان ثلاث مرات متتالية على Staging.

المرحلة 6: مشروع المرجع Tameed CRM (4 إلى 6 أسابيع)
الهدف: إثبات أن Sitekit يصلح للمشاريع الحقيقية، واكتشاف الفجوات قبل الإطلاق.
المهام:

إنشاء مشروع Tameed من sitekit-template.
نقل منطق CRM الحالي إلى وحدات (leads, customers, vehicles, sales, follow-ups, tasks, campaigns, reports).
تطبيق هوية تعميد عبر Tokens فقط، دون تعديل مكونات النواة.
إضافة أي حاجة مشتركة اكتُشفت إلى النواة عبر طلبات تطوير موثقة.
المخرجات: Tameed CRM يعمل على Sitekit، مع قائمة "فجوات النواة" التي تم حلها.
معيار الإنهاء: كل الوحدات تعمل، واختبارات الصلاحيات تمر، ولا توجد تعديلات داخل النواة خارج الطرق المعتمدة.

ملاحظة: خطة إعادة تسمية Tameed CRM والتصميم (من الخطة السابقة) تُنفَّذ ضمن هذه المرحلة، بعد أن تصبح بنية المشروع مستقرة.

المرحلة 7: التصلب والإطلاق 1.0.0 (أسبوعان)
المهام:

مراجعة أمنية كاملة (قائمة القسم 10) مع اختبار اختراق بسيط أو أداة فحص.
تحسين الأداء: مراجعة N+1، فهارس، حجم الـ bundle.
اكتمال التوثيق كاملاً (القسم 14).
Runbook للطوارئ وتدريب الفريق عليه.
إطلاق v1.0.0 على قناة stable، ودليل ترقية لمشاريع v0.x إن وُجدت.
معيار الإنهاء (Definition of Done لـ v1.0.0):

كل الاختبارات تمر، ونسبة تغطية متفق عليها (مثلاً 70% للـ Backend الحرج).
لا ثغرات عالية أو حرجة في الفحوص.
مشروعان على الأقل يعملان على الإصدار 1.0.0.
التوثيق مكتمل ومراجَع.
الجدول الزمني الإجمالي التقريبي: 16 إلى 19 أسبوعاً.

16. المخاطر وإجراءات التخفيف
الخطر	الاحتمال	الأثر	التخفيف
تضخم النواة وتعقيدها (Over-engineering)	عالٍ	عالٍ	مبدأ "لا نضيف إلا عند الحاجة من مشروعين"، ومراجعة معمارية شهرية
كسر المشاريع عند التحديث	متوسط	عالٍ	Semver صارم، OpenAPI diff، Staging إلزامي، Rollback مختبر
تعديلات العملاء على النواة	متوسط	عالٍ	فصل المجلدات، منع التعديل عبر قواعد CI، ونقاط تمديد واضحة
ثغرة أمنية في الاعتماديات	متوسط	عالٍ	Dependabot، audit في CI، تحديث دوري، سياسة استجابة للطوارئ
تسريب مفتاح توقيع التحديثات	منخفض	حرج	مدير أسرار، صلاحيات محدودة، إجراء تدوير مكتوب
تحديث فاشل يعطل الإنتاج	متوسط	عالٍ	وضع الصيانة، نسخ قبل التحديث، health check، Rollback تلقائي
تباين بيئات الاستضافة عند العملاء	عالٍ	متوسط	فحص متطلبات قبل التحديث، وتوثيق الحد الأدنى للاستضافة
الاعتماد على شخص واحد	متوسط	متوسط	توثيق، مراجعة متبادلة للـ PRs، ADR
ضعف الترجمة والـ RTL عند التوسع	متوسط	متوسط	مراجعة عربية مع كل ميزة، واختبارات بصرية في الاتجاهين
17. مؤشرات النجاح
المؤشر	الهدف
وقت إنشاء مشروع جديد من القالب	أقل من يوم للمشروع الأساسي
وقت إنشاء وحدة CRUD جديدة	أقل من ساعة بما فيها الاختبارات
نسبة نجاح الترقيات	100% على Staging، و95%+ على الإنتاج
زمن استعادة بعد ترقية فاشلة	أقل من 15 دقيقة
الثغرات الحرجة/العالية المفتوحة	صفر
زمن استجابة API للقوائم (p95)	أقل من 300ms مع 10 آلاف سجل
Lighthouse (الأداء والـ Accessibility)	90+ للصفحات العامة
تغطية الاختبارات للمسارات الحرجة	100% (Auth, Permissions, Upgrade)
18. أسئلة يجب حسمها قبل البدء
الاستضافة: VPS خاص بكل عميل؟ أم استضافة مشتركة؟ أم سيرفر مُدار عندكم؟ (يحدد مستوى التحديث الممكن).
قاعدة البيانات: MySQL أم PostgreSQL؟ (الأغلب عند العملاء في السوق العربي: MySQL).
النطاقات: هل الواجهة والـ API على نفس النطاق الجذري (مثل app.example.com وapi.example.com)؟ (يحدد Sanctum SPA أو Tokens).
نموذج الترخيص: ترخيص لكل عميل؟ اشتراك سنوي يشمل التحديثات؟ ملكية كاملة للكود؟
من يصل لمستودع النواة؟ فريقكم فقط، أم عملاء مع وصول للقراءة؟
اللغات: العربية أساسية والإنجليزية ثانوية؟ هل هناك لغات أخرى مستقبلاً؟
مستوى التحديث المطلوب للعميل: إشعار فقط؟ أم زر تحديث؟ أم تحديث مُدار من فريقكم؟
الحد الأدنى للبيئة: إصدارات PHP وNode وقواعد البيانات المدعومة.
الدعم الفني: SLA، قنوات التبليغ، ومن يستجيب للتحديثات الأمنية.
الأدوات المدفوعة: هل توافقون على أدوات مدفوعة مثل Private Packagist أو Sentry؟ أم نكتفي بالمجانية؟
فريق العمل: عدد المطورين وساعات العمل المتاحة (يؤثر مباشرة على الجدول الزمني).
المشاريع الأولى: ما هي المشاريع الثلاثة الأولى التي ستُبنى على Sitekit؟
19. أول أسبوع: مهام تنفيذية بالترتيب
اليوم 1:

إنشاء المستودعات: sitekit-core، sitekit-template.
إضافة README.md وLICENSE (أو ملف الترخيص الداخلي) و.gitignore و.editorconfig.
كتابة ADR-0001 (المعمارية العامة) وADR-0002 (نموذج التحديثات).
اليوم 2:

تهيئة Laravel الأحدث داخل backend/ مع Pint وLarastan وPest.
إعداد composer.json بحزمة sitekit/core كـ path repository محلياً.
إعداد config/sitekit.php مع version وupdate_channel.
اليوم 3:

تهيئة React + Vite + TypeScript strict داخل frontend/ مع ESLint وPrettier.
إنشاء packages/ui وpackages/api-client كـ pnpm workspace.
إضافة tokens.json وتوليد tokens.css، وربط الخطوط.
اليوم 4:

Docker Compose (app, web, db, redis, node, mailpit).
إضافة /api/v1/health و/api/v1/system/info، وربطهما بصفحة اختبار في الواجهة.
اليوم 5:

CI: lint + tests + build + audit على كل PR.
إضافة قالب Pull Request وقالب Issue.
اجتماع مراجعة: إغلاق المرحلة 1 أو تسجيل ما تبقى.
مخرج الأسبوع: مشروع فارغ يعمل من أول أمر، وCI أخضر، وأول مسار API يعمل بين الواجهة والخادم.

20. الخطوة التالية
لكي أحوّل هذه الخطة إلى تنفيذ فعلي، أحتاج منك:
