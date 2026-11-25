<?php

declare(strict_types=1);

namespace App\Modules\WhatsApp\Drivers;

use App\Modules\WhatsApp\Services\WhatsAppSettings;
use App\Modules\WhatsApp\Support\InboundMessage;
use App\Modules\WhatsApp\Support\SendResult;
use App\Modules\WhatsApp\Support\StatusUpdate;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

/**
 * WhatsApp Business Cloud API (Meta Graph API).
 */
class MetaCloudDriver implements WhatsAppDriver
{
    public const GRAPH_URL = 'https://graph.facebook.com';

    public function __construct(private readonly WhatsAppSettings $settings) {}

    public function name(): string
    {
        return 'meta';
    }

    public function sendText(string $toE164, string $body): SendResult
    {
        return $this->send([
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => $toE164,
            'type' => 'text',
            'text' => ['preview_url' => true, 'body' => $body],
        ]);
    }

    public function sendTemplate(string $toE164, array $notification, array $parameters): SendResult
    {
        $template = [
            'name' => (string) $notification['template_name'],
            'language' => ['code' => (string) ($notification['template_language'] ?: 'ar')],
        ];

        if ($parameters !== []) {
            $template['components'] = [[
                'type' => 'body',
                'parameters' => array_map(fn (string $text) => ['type' => 'text', 'text' => $text], $parameters),
            ]];
        }

        return $this->send([
            'messaging_product' => 'whatsapp',
            'to' => $toE164,
            'type' => 'template',
            'template' => $template,
        ]);
    }

    public function hasTemplate(array $notification): bool
    {
        return trim((string) ($notification['template_name'] ?? '')) !== '';
    }

    public function testConnection(): array
    {
        try {
            $response = $this->client()->get('/'.$this->phoneNumberId(), ['fields' => 'display_phone_number,verified_name,quality_rating']);
        } catch (ConnectionException $e) {
            return ['ok' => false, 'message' => 'تعذّر الاتصال بـ Meta: '.$e->getMessage()];
        }

        if (! $response->successful()) {
            return ['ok' => false, 'message' => 'رفضت Meta البيانات: '.$this->errorMessage($response)];
        }

        return ['ok' => true, 'message' => sprintf('تم الربط بالرقم %s (%s)', $response->json('display_phone_number', '?'), $response->json('verified_name', ''))];
    }

    /**
     * Webhooks are signed with the secret of the Meta app that subscribed: the showroom's own app
     * (manual connection) or the platform app (Embedded Signup).
     */
    public function verifySignature(Request $request): bool
    {
        $signature = (string) $request->header('X-Hub-Signature-256', '');

        if (! str_starts_with($signature, 'sha256=')) {
            return false;
        }

        $secrets = array_filter([
            $this->settings->secret('meta', 'app_secret'),
            (string) config('whatsapp.embedded_signup.app_secret', ''),
        ]);

        foreach ($secrets as $secret) {
            if (hash_equals('sha256='.hash_hmac('sha256', $request->getContent(), $secret), $signature)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Number + account health as Meta reports it (display name review, quality, daily limit...).
     *
     * @return array{ok: bool, message?: string, phone?: array<string, mixed>, account?: array<string, mixed>|null}
     */
    public function health(): array
    {
        if ($this->settings->secret('meta', 'access_token') === null || $this->phoneNumberId() === '') {
            return ['ok' => false, 'message' => 'الرقم غير مربوط بعد'];
        }

        try {
            $phone = $this->client()->get('/'.$this->phoneNumberId(), [
                'fields' => 'display_phone_number,verified_name,name_status,quality_rating,messaging_limit_tier,code_verification_status,platform_type,throughput,status',
            ]);
            $wabaId = (string) $this->settings->get('meta.business_account_id', '');
            $account = $wabaId !== '' ? $this->client()->get('/'.$wabaId, ['fields' => 'name,account_review_status,currency']) : null;
        } catch (ConnectionException $e) {
            return ['ok' => false, 'message' => 'تعذّر الاتصال بـ Meta: '.$e->getMessage()];
        }

        if (! $phone->successful()) {
            return ['ok' => false, 'message' => 'رفضت Meta الطلب: '.$this->errorMessage($phone)];
        }

        return [
            'ok' => true,
            'phone' => $phone->json(),
            'account' => $account?->successful() ? $account->json() : null,
        ];
    }

    /**
     * Every template of the WhatsApp Business account (follows Graph API paging).
     *
     * @return array{ok: bool, message?: string, templates?: list<array<string, mixed>>}
     */
    public function fetchTemplates(int $maxPages = 10): array
    {
        $wabaId = (string) $this->settings->get('meta.business_account_id', '');
        if ($this->settings->secret('meta', 'access_token') === null || $wabaId === '') {
            return ['ok' => false, 'message' => 'أضف WhatsApp Business Account ID والتوكن أولاً'];
        }

        $templates = [];
        $after = null;

        try {
            for ($page = 0; $page < $maxPages; $page++) {
                $response = $this->client()->get("/{$wabaId}/message_templates", array_filter([
                    'fields' => 'id,name,language,status,category,components,rejected_reason',
                    'limit' => 100,
                    'after' => $after,
                ]));

                if (! $response->successful()) {
                    return ['ok' => false, 'message' => 'رفضت Meta الطلب: '.$this->errorMessage($response)];
                }

                array_push($templates, ...(array) $response->json('data', []));
                $after = $response->json('paging.cursors.after');

                if (! $response->json('paging.next') || ! $after) {
                    break;
                }
            }
        } catch (ConnectionException $e) {
            return ['ok' => false, 'message' => 'تعذّر الاتصال بـ Meta: '.$e->getMessage()];
        }

        return ['ok' => true, 'templates' => $templates];
    }

    public function parseWebhook(Request $request): array
    {
        $messages = [];
        $statuses = [];

        foreach ((array) $request->input('entry', []) as $entry) {
            foreach ((array) ($entry['changes'] ?? []) as $change) {
                $value = (array) ($change['value'] ?? []);
                $names = collect((array) ($value['contacts'] ?? []))->mapWithKeys(fn ($c) => [(string) ($c['wa_id'] ?? '') => $c['profile']['name'] ?? null]);

                foreach ((array) ($value['messages'] ?? []) as $message) {
                    $type = (string) ($message['type'] ?? 'text');
                    $body = match ($type) {
                        'text' => $message['text']['body'] ?? null,
                        'button' => $message['button']['text'] ?? null,
                        'interactive' => $message['interactive']['button_reply']['title'] ?? $message['interactive']['list_reply']['title'] ?? null,
                        'image', 'video', 'document' => $message[$type]['caption'] ?? null,
                        default => null,
                    };
                    $from = (string) ($message['from'] ?? '');
                    $messages[] = new InboundMessage($from, $names[$from] ?? null, (string) ($message['id'] ?? ''), $type, $body, $message);
                }

                foreach ((array) ($value['statuses'] ?? []) as $status) {
                    $error = $status['errors'][0]['message'] ?? $status['errors'][0]['title'] ?? null;
                    $pricing = (array) ($status['pricing'] ?? []);
                    $statuses[] = new StatusUpdate(
                        (string) ($status['id'] ?? ''),
                        (string) ($status['status'] ?? ''),
                        $error,
                        isset($pricing['category']) ? (string) $pricing['category'] : null,
                        isset($pricing['billable']) ? (bool) $pricing['billable'] : null,
                    );
                }
            }
        }

        return ['messages' => $messages, 'statuses' => $statuses];
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function send(array $payload): SendResult
    {
        if ($this->settings->secret('meta', 'access_token') === null || $this->phoneNumberId() === '') {
            return SendResult::failed('بيانات WhatsApp Business غير مكتملة');
        }

        try {
            $response = $this->client()->post('/'.$this->phoneNumberId().'/messages', $payload);
        } catch (ConnectionException $e) {
            return SendResult::failed('Connection failed: '.$e->getMessage());
        }

        if (! $response->successful()) {
            return SendResult::failed($this->errorMessage($response));
        }

        return new SendResult(true, (string) $response->json('messages.0.id'));
    }

    private function errorMessage(Response $response): string
    {
        return (string) ($response->json('error.error_data.details') ?? $response->json('error.message') ?? "HTTP {$response->status()}");
    }

    private function phoneNumberId(): string
    {
        return (string) $this->settings->get('meta.phone_number_id', '');
    }

    private function client(): PendingRequest
    {
        $version = trim((string) $this->settings->get('meta.graph_version', 'v23.0'), '/') ?: 'v23.0';

        return Http::baseUrl(self::GRAPH_URL.'/'.$version)
            ->withToken((string) $this->settings->secret('meta', 'access_token'))
            ->acceptJson()
            ->asJson()
            ->timeout(20);
    }
}
