<?php

declare(strict_types=1);

namespace App\Modules\WhatsApp\Services;

use App\Modules\WhatsApp\Drivers\MetaCloudDriver;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * WhatsApp Embedded Signup: the showroom logs in with its own Meta account, picks its
 * WhatsApp Business account + number (e.g. the unified 9200 number), and Meta bills the showroom directly.
 *
 * After the popup: exchange the code for a business token, subscribe the platform app to the
 * account's webhooks (pointing at THIS showroom's URL), and register the number on the Cloud API.
 */
class MetaOnboarding
{
    public function __construct(private readonly WhatsAppSettings $settings) {}

    /** The platform's Meta app is configured, so the "connect with Meta" button can be offered. */
    public function isAvailable(): bool
    {
        return $this->appId() !== '' && $this->appSecret() !== '' && $this->configId() !== '';
    }

    /**
     * Public values the browser needs to open the Embedded Signup popup.
     *
     * @return array{available: bool, app_id: string, config_id: string, graph_version: string}
     */
    public function clientConfig(): array
    {
        return [
            'available' => $this->isAvailable(),
            'app_id' => $this->appId(),
            'config_id' => $this->configId(),
            'graph_version' => $this->graphVersion(),
        ];
    }

    /**
     * @return array{ok: bool, message: string, warnings?: list<string>}
     */
    public function complete(string $code, string $wabaId, string $phoneNumberId, string $callbackUrl): array
    {
        if (! $this->isAvailable()) {
            return ['ok' => false, 'message' => 'الربط السريع غير مفعّل على المنصة. استخدم الربط اليدوي.'];
        }

        try {
            $token = $this->graph()->get('/oauth/access_token', [
                'client_id' => $this->appId(),
                'client_secret' => $this->appSecret(),
                'code' => $code,
            ]);

            if (! $token->successful() || ! $token->json('access_token')) {
                return ['ok' => false, 'message' => 'رفضت Meta رمز الربط: '.$this->errorMessage($token)];
            }
            $accessToken = (string) $token->json('access_token');
            $warnings = [];

            // Webhooks of this account go to this showroom (the platform app serves many showrooms).
            $subscribe = $this->graph($accessToken)->post("/{$wabaId}/subscribed_apps", [
                'override_callback_uri' => $callbackUrl,
                'verify_token' => (string) $this->settings->get('meta.verify_token'),
            ]);
            if (! $subscribe->successful()) {
                $warnings[] = 'تعذّر ربط الرسائل الواردة (Webhook): '.$this->errorMessage($subscribe);
            }

            // Register the number on the Cloud API with a two-step verification PIN we keep.
            $pin = $this->settings->secret('meta', 'pin') ?? (string) random_int(100000, 999999);
            $register = $this->graph($accessToken)->post("/{$phoneNumberId}/register", [
                'messaging_product' => 'whatsapp',
                'pin' => $pin,
            ]);
            if (! $register->successful()) {
                $warnings[] = 'تعذّر تسجيل الرقم على Cloud API: '.$this->errorMessage($register);
            }
        } catch (ConnectionException $e) {
            return ['ok' => false, 'message' => 'تعذّر الاتصال بـ Meta: '.$e->getMessage()];
        }

        $this->settings->update([
            'enabled' => true,
            'provider' => 'meta',
            'meta' => [
                'phone_number_id' => $phoneNumberId,
                'business_account_id' => $wabaId,
                'connection' => 'embedded',
                'connected_at' => now()->toIso8601String(),
            ],
        ], ['meta' => ['access_token' => $accessToken, 'pin' => $pin]]);
        Cache::forget(self::healthCacheKey());

        return [
            'ok' => true,
            'message' => $warnings === [] ? 'تم ربط رقم الشركة بواتساب بنجاح' : 'تم الربط مع ملاحظات تحتاج مراجعة',
            'warnings' => $warnings,
        ];
    }

    /**
     * Cached health of the connected number (Meta quality, limits, display name review).
     *
     * @return array<string, mixed>
     */
    public function health(MetaCloudDriver $driver, bool $refresh = false): array
    {
        if ($refresh) {
            Cache::forget(self::healthCacheKey());
        }

        $health = Cache::remember(self::healthCacheKey(), (int) config('whatsapp.health_cache_seconds', 600), function () use ($driver) {
            return [...$driver->health(), 'checked_at' => now()->toIso8601String()];
        });

        if (! $health['ok']) {
            Cache::forget(self::healthCacheKey()); // don't keep failures for 10 minutes
        }

        return $health;
    }

    public static function healthCacheKey(): string
    {
        return 'whatsapp.meta.health';
    }

    private function graph(?string $token = null): PendingRequest
    {
        $request = Http::baseUrl(MetaCloudDriver::GRAPH_URL.'/'.$this->graphVersion())->acceptJson()->timeout(20);

        return $token !== null ? $request->withToken($token)->asJson() : $request;
    }

    private function errorMessage(Response $response): string
    {
        return (string) ($response->json('error.error_data.details') ?? $response->json('error.message') ?? "HTTP {$response->status()}");
    }

    private function graphVersion(): string
    {
        return trim((string) $this->settings->get('meta.graph_version', 'v23.0'), '/') ?: 'v23.0';
    }

    private function appId(): string
    {
        return (string) config('whatsapp.embedded_signup.app_id', '');
    }

    private function appSecret(): string
    {
        return (string) config('whatsapp.embedded_signup.app_secret', '');
    }

    private function configId(): string
    {
        return (string) config('whatsapp.embedded_signup.config_id', '');
    }
}
