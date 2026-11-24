# إعداد تحديثات Sitekit عبر GitHub Actions

> المعمارية: **ريبو أساسي (upstream)** إنت بتنشر منه الإصدارات، و**ريبو لكل عميل**، و**VPS لكل عميل**.
> صاحب المعرض بيشوف "تحديث متاح" في **لوحة التحكم ← تحديثات النظام**، وهو اللي بيضغط "تثبيت".

```
 ريبو Sitekit الأساسي                 ريبو العميل                      VPS العميل
 ───────────────────                 ───────────                      ──────────
 Actions → Sitekit Release           sitekit-update.yml               .github/sitekit/deploy.sh
   tests → VERSION → tag v1.1.0        ← dispatch من لوحة التحكم         backup → git reset → composer
   → GitHub Release                    merge tag → tests → push          → assets → migrate → optimize
   → notify (اختياري) ─────────────►   build → SSH deploy ────────────►  → health → up  (rollback لو فشل)
                                       ← callbacks بالتقدم (HMAC) ──────► لوحة التحكم تعرض الخطوات
```

---

## 1. الريبو الأساسي (مرة واحدة)

1. **Settings ← Secrets and variables ← Actions:**
   - **Variable:** `SITEKIT_ROLE` = `upstream`. من غيره workflow الإصدار مش هيشتغل.
   - **Secret (اختياري):** `SITEKIT_INSTANCE_URLS` = `https://client1.com,https://client2.com`، عشان الإشعار يوصل فوراً. من غيره كل موقع بيكتشف التحديث في الفحص اليومي الساعة 3 الفجر.
   - **Secret (اختياري):** `SITEKIT_DEPLOY_SECRET`. لازم يبقى نفس القيمة اللي في `.env` عند العملاء، لو هتستخدم الإشعار الفوري.
2. لو الفرع `main` أو `Master` عليه branch protection، اسمح لـ GitHub Actions إنه يعمل push، لأن الـ workflow بيعمل commit لملف `VERSION`.

### نشر إصدار جديد
**Actions ← Sitekit Release ← Run workflow:**
- `version`: مثلاً `1.1.0`. أو `1.2.0-beta.1` للتجريبي، وده بيظهر بس للعملاء اللي على قناة `beta`.
- `notes`: ملاحظات الإصدار اللي هتظهر لصاحب المعرض في لوحة التحكم.

الـ workflow بيشغّل الاختبارات، ويحدّث `VERSION`، ويعمل tag `v1.1.0`، وينشر Release، ويبعت إشعار للعملاء.
**مفيش أي حاجة بتتثبّت أوتوماتيك.**

> إصدارات SemVer: `PATCH` (1.0.**1**) للإصلاحات، و`MINOR` (1.**1**.0) للميزات، و`MAJOR` (**2**.0.0) لأي تغيير بيكسر التوافق.

---

## 2. عميل جديد (ريبو + VPS)

### 2.1 إنشاء ريبو العميل بنفس تاريخ git (مهم للـ merge)
```bash
git clone https://github.com/<you>/sitekit.git noauf-site
cd noauf-site
git remote rename origin upstream
git remote add origin https://github.com/<client-org>/noauf-site.git
git push -u origin main
```
> ⚠️ متستخدمش "Use this template" ولا رفع zip، لأن الطريقتين دول بيضيّعوا تاريخ git، والـ merge الأوتوماتيك هيفشل.
> تخصيصات العميل (الفرونت، اللوجو، الإعدادات) بتتعمل في ريبو العميل، و**متعدّلش ملفات النواة**. أي تعديل في النواة بيعمل conflict مع كل تحديث.

### 2.2 إعدادات ريبو العميل (Settings ← Secrets and variables ← Actions)
| النوع | الاسم | القيمة |
|---|---|---|
| Variable | `SITEKIT_UPSTREAM_REPO` | `<you>/sitekit` |
| Secret | `SITEKIT_DEPLOY_SECRET` | نفس قيمة `.env` على الـ VPS. ولّدها بـ `openssl rand -hex 32` |
| Secret | `SITEKIT_UPSTREAM_TOKEN` | بس لو الريبو الأساسي private: token فيه **Contents: Read** على الريبو الأساسي |
| Secret | `VPS_HOST` | IP أو domain السيرفر |
| Secret | `VPS_USER` | مستخدم الـ deploy (مثلاً `deploy`) |
| Secret | `VPS_SSH_KEY` | المفتاح الخاص (private key) لمستخدم الـ deploy |
| Secret | `VPS_APP_PATH` | مسار المشروع على السيرفر، مثلاً `/var/www/noauf` |
| Secret | `VPS_PORT` | اختياري، الافتراضي 22 |

وكمان **Settings ← Actions ← General ← Workflow permissions**: اختار **Read and write**، وفعّل "Allow GitHub Actions to create pull requests".

### 2.3 تجهيز الـ VPS (مرة واحدة)
```bash
# PHP 8.4 + composer + git + mysqldump (للـ backup). مش محتاج Node، الأصول بتتبني في GitHub.
sudo adduser deploy && sudo usermod -aG www-data deploy
# أضف المفتاح العام بتاع VPS_SSH_KEY في ~deploy/.ssh/authorized_keys

cd /var/www && git clone https://github.com/<client-org>/noauf-site.git noauf   # deploy key للقراءة
cd noauf && cp .env.example .env && composer install --no-dev && php artisan key:generate
php artisan migrate --force && php artisan storage:link

# الـ scheduler (فحص التحديثات اليومي) + الـ queue
( crontab -l 2>/dev/null; echo "* * * * * cd /var/www/noauf && php artisan schedule:run >> /dev/null 2>&1" ) | crontab -
```
> السيرفر لازم يقدر يعمل `git fetch` من ريبو العميل. استخدم **Deploy key** للقراءة (Settings ← Deploy keys).

### 2.4 `.env` على الـ VPS
```dotenv
SITEKIT_UPDATE_CHANNEL=stable
SITEKIT_UPSTREAM_REPO=<you>/sitekit
SITEKIT_CLIENT_REPO=<client-org>/noauf-site
SITEKIT_CLIENT_BRANCH=main
SITEKIT_GITHUB_TOKEN=github_pat_xxx      # Fine-grained: Contents=Read على الأساسي + Actions=Read&Write على ريبو العميل
SITEKIT_DEPLOY_SECRET=<نفس قيمة السيكرت في ريبو العميل>
```
وبعدها `php artisan optimize`.

---

## 3. اللي بيشوفه صاحب المعرض

- في الـ sidebar: **تحديثات النظام**، وجنبها badge أخضر فيه رقم النسخة لو فيه تحديث.
- الصفحة فيها:
  - النسخة الحالية، والقناة، وآخر فحص.
  - ملاحظات الإصدار وزر **تثبيت التحديث الآن**.
  - أثناء التثبيت: الخطوات (دمج، اختبارات، بناء، نشر، اكتمل)، والسجل، ورابط لـ GitHub Actions.
  - سجل كل التحديثات اللي فاتت.
- **لو حصل conflict** مع تعديلات المشروع: الحالة بتبقى **يحتاج مراجعة مطوّر**، ويتفتح Pull Request في ريبو العميل. مفيش أي حاجة بتتنشر لحد ما مطوّر يحلّ الـ conflict ويعمل merge.
- **لو الاختبارات فشلت:** مفيش أي حاجة بتتنشر، والحالة بتبقى **فشل**.
- **لو النشر فشل على السيرفر:** الكود والأصول بيرجعوا للنسخة اللي قبلها أوتوماتيك، والموقع بيرجع يشتغل.
  - ⚠️ الـ migrations **مش بترجع أوتوماتيك**. لو migration بوّظت الـ schema، رجّع الداتابيز من الـ backup اللي اتاخد قبل النشر (`storage/app/<APP_NAME>/`).

## 4. الأمان
- كل webhook بين GitHub والموقع (notify وcallback) **موقّع HMAC-SHA256** بـ `SITEKIT_DEPLOY_SECRET`، وأي طلب من غير توقيع صحيح بيترفض (401).
- `notify` **بيحدّث الفحص بس، ومش بيثبّت أي حاجة**.
- التثبيت بيحصل **بس** لما أدمن يضغط من لوحة التحكم، ولازم النسخة تبقى نفس آخر إصدار منشور.
- token الـ GitHub في `.env` لازم يبقى **Fine-grained**، وعلى الريبوهين دول بس.

## 5. ⚠️ لازم يتشال: `deploy-instances.yml`
الـ workflow القديم `.github/workflows/deploy-instances.yml` بيبعت webhook لكل المواقع مع **كل push على main/Master**، والـ webhook ده بيعمل `git pull` على السيرفر **من غير موافقة صاحب المعرض**. وده عكس النظام الجديد.
**امسحه قبل ما تضيف أي عميل:**
```bash
git rm .github/workflows/deploy-instances.yml
```
ولو مسحته، الـ endpoint `/api/v1/system/deploy-webhook` يتشال كمان في الإصدار الجاي.
