<?php

namespace App\Services\Infrastructure;

use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Checks a CDN (pull zone) in front of this site before assets are switched to it:
 *  1. it serves this site's current build (same manifest as on disk), and
 *  2. JS comes back with Access-Control-Allow-Origin, which the browser requires for
 *     <script type="module" crossorigin> loaded from another domain.
 */
class CdnTester
{
    /**
     * @return array{ok: bool, message: string, warnings: list<string>}
     */
    public function test(string $cdnUrl): array
    {
        $base = rtrim($cdnUrl, '/');
        $localManifestPath = public_path('build/manifest.json');

        if (! is_file($localManifestPath)) {
            return ['ok' => false, 'message' => 'لا يوجد build للواجهة على السيرفر (public/build/manifest.json). شغّل npm run build أولاً.', 'warnings' => []];
        }

        $localManifest = json_decode((string) file_get_contents($localManifestPath), true);

        try {
            $response = Http::timeout(10)->get($base.'/build/manifest.json');
        } catch (Throwable $exception) {
            return ['ok' => false, 'message' => 'تعذر الوصول إلى الـ CDN: '.$exception->getMessage(), 'warnings' => []];
        }

        if (! $response->successful()) {
            return ['ok' => false, 'message' => 'الـ CDN رد بـ HTTP '.$response->status().' على build/manifest.json. تأكد أن مصدر الـ CDN (Origin) هو رابط هذا الموقع.', 'warnings' => []];
        }

        if ($response->json() !== $localManifest) {
            return ['ok' => false, 'message' => 'الـ CDN يقدم نسخة مختلفة من الملفات عن الموجودة على السيرفر. امسح كاش الـ CDN أو راجع الـ Origin.', 'warnings' => []];
        }

        $warnings = [];
        $script = collect(is_array($localManifest) ? $localManifest : [])->first(fn ($entry) => is_array($entry) && str_ends_with((string) ($entry['file'] ?? ''), '.js'));

        if ($script !== null) {
            try {
                $asset = Http::timeout(10)->withHeaders(['Origin' => rtrim((string) config('app.url'), '/')])->get($base.'/build/'.$script['file']);
                if (! $asset->header('Access-Control-Allow-Origin')) {
                    $warnings[] = 'ملفات JS من الـ CDN بدون هيدر Access-Control-Allow-Origin، والمتصفح سيرفض تشغيلها. فعّل CORS في إعدادات الـ CDN (أو امسح كاشه بعد التحديث، فالسيرفر أصبح يرسل الهيدر).';
                }
            } catch (Throwable) {
                $warnings[] = 'تعذر فحص هيدر CORS على ملفات JS.';
            }
        }

        return [
            'ok' => $warnings === [],
            'message' => $warnings === [] ? 'الـ CDN يعمل ويقدم نفس ملفات الموقع.' : 'الـ CDN يعمل لكن يحتاج ضبط قبل التفعيل.',
            'warnings' => $warnings,
        ];
    }
}
