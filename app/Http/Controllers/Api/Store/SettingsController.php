<?php

namespace App\Http\Controllers\Api\Store;

use App\Http\Api\Contracts\ApiResponse;
use App\Http\Api\Response\Builder\ApiResponseBuilder;
use App\Http\Controllers\Api\ApiBaseController;
use App\Http\Resources\Store\SettingResource;
use App\Models\Setting;
use App\Services\Api\Store\SettingApiService;
use Illuminate\Http\Request;

final class SettingsController extends ApiBaseController
{
    public function __construct(
        private readonly SettingApiService $settingService,
    ) {
        parent::__construct(app(ApiResponseBuilder::class));
    }

    public function footer(): ApiResponse
    {
        return $this->respondSuccess(
            $this->settingService->footer(),
            'Footer data retrieved successfully'
        );
    }

    public function getFinanceSolution(): ApiResponse
    {
        return $this->respondSuccess(
            $this->settingService->financeSolution(),
            'Finance solution data retrieved successfully'
        );
    }

    public function index(Request $request)
    {
        $keys = $request->query('keys');

        if (is_string($keys)) {
            $keys = explode(',', $keys);
        }

        $keys = is_array($keys) ? $keys : null;

        $settings = $this->settingService->list($keys);

        $items = collect($settings)->map(fn ($value, $key) => [
            'key' => $key,
            'value' => $value,
        ])->values();

        return $this->respondSuccess(
            SettingResource::collection($items)->resolve(),
            'Settings retrieved successfully'
        );
    }

    public function legalPage(string $slug): ApiResponse
    {
        $normalized = match (str_replace('_', '-', strtolower($slug))) {
            'terms', 'terms-conditions', 'terms-and-conditions', 'terms-of-service' => 'terms',
            default => 'privacy',
        };

        $key = $normalized === 'terms' ? 'page_terms_conditions' : 'page_privacy_policy';
        $setting = Setting::where('key', $key)->first();
        $data = $setting?->value;

        if (! is_array($data) || empty($data['content'])) {
            $data = self::defaultLegalData($normalized);
        }

        $locale = app()->getLocale() ?: 'ar';
        $title = is_array($data['title'] ?? null)
            ? ($data['title'][$locale] ?? $data['title']['ar'] ?? reset($data['title']))
            : ($data['title'] ?? ($normalized === 'terms' ? 'الشروط والأحكام' : 'سياسة الخصوصية'));

        $content = is_array($data['content'] ?? null)
            ? ($data['content'][$locale] ?? $data['content']['ar'] ?? reset($data['content']))
            : ($data['content'] ?? '');

        return $this->respondSuccess([
            'slug' => $normalized,
            'key' => $key,
            'title' => $title,
            'title_translations' => is_array($data['title'] ?? null) ? $data['title'] : ['ar' => $title, 'en' => $title],
            'content' => $content,
            'content_translations' => is_array($data['content'] ?? null) ? $data['content'] : ['ar' => $content, 'en' => $content],
            'updated_at' => $data['updated_at'] ?? $setting?->updated_at?->toISOString() ?? now()->toISOString(),
        ], 'Legal page retrieved successfully');
    }

    public static function defaultLegalData(string $type): array
    {
        if ($type === 'terms') {
            return [
                'title' => [
                    'ar' => 'الشروط والأحكام',
                    'en' => 'Terms & Conditions',
                ],
                'content' => [
                    'ar' => '<h2>1. القبول بالشروط</h2><p>تنظم هذه الشروط والأحكام استخدامك لموقع ومنصة <strong>نواف أوتو</strong> وجميع الخدمات المرتبطة بها. يُعد استخدامك للمنصة أو تعبئة أي نموذج بها إقراراً منك بالاطلاع والموافقة التامة والملزمة على هذه الشروط.</p><h2>2. طبيعة الخدمات المقدمة</h2><p>تقدم منصة نواف أوتو خدمات الوساطة الرقمية والتسويقية لتجارة السيارات وتمويلها وتقسيطها، من خلال تسهيل ربط العملاء الراغبين في اقتناء المركبات مع الوكلاء والموزعين المعتمدين وكبرى جهات التمويل من بنوك وشركات تمويلية مرخصة في المملكة العربية السعودية.</p><h2>3. حاسبة التمويل ودقة التقديرات</h2><p>توضح الشركة ما يلي بشأن حاسبة التمويل والأقساط التقديرية:</p><ul><li>جميع النتائج والمبالغ والأقساط الشهرية ونسب الفائدة المعروضة على المنصة هي <strong>نتائج استرشادية تقريبية</strong> تعتمد على المعطيات التي يدخلها العميل.</li><li>تخضع الموافقة التمويلية النهائية لدراسة السجل الائتماني (سمة) والسياسات الائتمانية الخاصة بكل بنك أو جهة تمويلية مانحة.</li><li>لا يُعد تقديم طلب التقدير التمويلي التزاماً بنكياً ملزماً حتى استكمال وثائق التعميد الرسمية وتوقيع عقود التمويل.</li></ul><h2>4. التزامات ومسؤوليات العميل</h2><ul><li>يتعهد العميل بتقديم معلومات وبيانات صحيحة ودقيقة وحديثة عن هويته، راتبه، التزاماته المالية، وجهة عمله.</li><li>يتحمل العميل كامل المسؤولية النظامية عن أي بيانات خاطئة أو مضللة قد تؤدي لرفض طلب التمويل أو تأخيره.</li><li>يوافق العميل صراحة على قيام فريق نواف أوتو بالتواصل معه عبر الهاتف، الرسائل النصية القصيرة (SMS)، أو تطبيق واتساب لمتابعة طلبه واستكمال الإجراءات.</li></ul><h2>5. الأسعار وتوفر المركبات</h2><p>تخضع أسعار السيارات ومواصفاتها وتوفرها في المخزون للتحديث الدوري وفقاً للأسواق والوكلاء الرسميين. يتم اعتماد السعر والمواصفات بشكل نهائي ورسمي عند توقيع سند الحجز أو التعميد التمويلي.</p><h2>6. التعديل على الشروط والأنظمة الحاكمة</h2><p>تحتفظ الشركة بالحق في تعديل هذه الشروط في أي وقت، وتصبح نافذة فور نشرها على هذه الصفحة. تخضع هذه الشروط وتُفسر وفقاً للأنظمة واللوائح السارية في المملكة العربية السعودية.</p>',
                    'en' => '<h2>1. Acceptance of Terms</h2><p>These terms govern your use of <strong>Noaf Auto</strong> platform. By accessing or submitting forms through the website, you confirm your acceptance of these Terms & Conditions.</p><h2>2. Services Description</h2><p>Noaf Auto provides digital auto finance brokerage services in Saudi Arabia, connecting buyers with certified car dealers and licensed financing institutions.</p><h2>3. Finance Calculator Estimates</h2><p>All calculations, monthly installments, and estimates generated by the online calculator are indicative and non-binding. Final finance approval is subject to credit bureau assessment (SIMAH) and the financing entity terms.</p><h2>4. Customer Obligations</h2><p>You agree to provide true, accurate, and complete information regarding your identity, employment, and income. You authorize our team to contact you via phone, SMS, or WhatsApp regarding your inquiry.</p><h2>5. Applicable Law</h2><p>These terms are governed by the laws and regulations of the Kingdom of Saudi Arabia.</p>',
                ],
                'updated_at' => now()->toISOString(),
            ];
        }

        return [
            'title' => [
                'ar' => 'سياسة الخصوصية',
                'en' => 'Privacy Policy',
            ],
            'content' => [
                'ar' => '<h2>1. مقدمة والتزام</h2><p>تلتزم شركة <strong>نواف أوتو</strong> بحماية أمان وخصوصية بياناتك الشخصية والمالية وفقاً للأنظمة واللوائح المعمول بها في المملكة العربية السعودية، وعلى رأسها نظام حماية البيانات الشخصية الصادر بالمرسوم الملكي الكريم رقم (م/19) ولائحته التنفيذية.</p><h2>2. البيانات التي نجمعها</h2><p>لتقديم خدمات الوساطة التمويلية وشراء السيارات بدقة واحترافية، نقوم بجمع البيانات الضرورية فقط، وتشمل:</p><ul><li><strong>البيانات الشخصية الأساسية:</strong> الاسم الكامل، رقم الهوية الوطنية أو الإقامة، والمدينة.</li><li><strong>بيانات التواصل:</strong> رقم الجوال وعنوان البريد الإلكتروني.</li><li><strong>البيانات المالية والوظيفية:</strong> الراتب الشهري الصافي، جهة العمل، وإجمالي الالتزامات الشهرية القائمة.</li><li><strong>تفضيلات السيارة والتمويل:</strong> نوع وماركة السيارة المطلوبة، الميزانية المتوقعة، والدفعة الأولى.</li></ul><h2>3. الغرض من جمع البيانات واستخدامها</h2><p>تُستخدم بياناتك حصراً ومباشرة للأغراض التالية:</p><ul><li>حساب تقديرات التمويل والأقساط الشهرية عبر حاسبة التمويل بالمنصة.</li><li>مشاركة البيانات مع شركائنا المعتمدين من البنوك وشركات التمويل المرخصة من البنك المركزي السعودي (ساما) لاستخراج عروض الأسعار.</li><li>التواصل معك عبر الاتصال الهاتفي أو تطبيق واتساب لمتابعة طلبك وتقديم الاستشارات التمويلية المباشرة.</li><li>إتمام إجراءات الحجز، إصدار اللوحات، وتسليم المركبة.</li></ul><h2>4. سرية وأمان البيانات وعدم مشاركتها</h2><p>نحن نتخذ كافة التدابير الأمنية والتقنية الصارمة لحماية بياناتك. نؤكد لك أننا <strong>لا نقوم بأي شكل من الأشكال ببيع أو تأجير بياناتك الشخصية</strong> لأي جهة ثالثة لأغراض تسويقية غير متعلقة بطلبك التمويلي.</p><h2>5. حقوق العميل والتواصل</h2><p>وفقاً للأنظمة السعودية، يحق لك ممارسة حقوقك النظامية في طلب الاطلاع على بياناتك، تصحيحها، أو طلب حذفها بعد انتهاء الغرض منها. للتواصل بخصوص سياسة الخصوصية، يرجى مراسلتنا عبر قنوات التواصل المعتمدة بالمنصة.</p>',
                'en' => '<h2>1. Introduction & Commitment</h2><p><strong>Noaf Auto</strong> is committed to protecting the privacy and security of your personal and financial information in compliance with the Personal Data Protection Law (PDPL) of the Kingdom of Saudi Arabia.</p><h2>2. Information We Collect</h2><p>To provide finance brokerage and vehicle booking services, we collect only necessary data including: full name, national ID / Iqama, contact details (phone, email, city), employment and income details, monthly obligations, and vehicle preferences.</p><h2>3. Purpose of Processing</h2><p>We process your data to calculate financing estimates, connect you with SAMA-regulated banks and finance companies with your consent, communicate application updates via phone or WhatsApp, and complete vehicle booking.</p><h2>4. Data Confidentiality</h2><p>We apply high technical and administrative security measures. We strictly never sell or rent your personal information to third parties for independent marketing.</p><h2>5. Your Rights</h2><p>You have the right to access, rectify, or request deletion of your personal data according to applicable Saudi laws.</p>',
            ],
            'updated_at' => now()->toISOString(),
        ];
    }
}
