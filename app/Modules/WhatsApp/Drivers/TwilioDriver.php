<?php

declare(strict_types=1);

namespace App\Modules\WhatsApp\Drivers;

use App\Modules\WhatsApp\Services\WhatsAppSettings;
use App\Modules\WhatsApp\Support\InboundMessage;
use App\Modules\WhatsApp\Support\PhoneNumber;
use App\Modules\WhatsApp\Support\SendResult;
use App\Modules\WhatsApp\Support\StatusUpdate;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

/**
 * Twilio WhatsApp (Programmable Messaging REST API).
 */
class TwilioDriver implements WhatsAppDriver
{
    public const API_URL = 'https://api.twilio.com/2010-04-01';

    /** Twilio statuses → our statuses. */
    private const STATUSES = [
        'accepted' => 'queued', 'queued' => 'queued', 'sending' => 'queued', 'sent' => 'sent',
        'delivered' => 'delivered', 'read' => 'read', 'failed' => 'failed', 'undelivered' => 'failed',
    ];

    public function __construct(private readonly WhatsAppSettings $settings) {}

    public function name(): string
    {
        return 'twilio';
    }

    public function sendText(string $toE164, string $body): SendResult
    {
        return $this->send($toE164, ['Body' => $body]);
    }

    public function sendTemplate(string $toE164, array $notification, array $parameters): SendResult
    {
        $variables = [];
        foreach (array_values($parameters) as $index => $value) {
            $variables[(string) ($index + 1)] = $value;
        }

        return $this->send($toE164, [
            'ContentSid' => (string) $notification['twilio_content_sid'],
            'ContentVariables' => json_encode($variables, JSON_UNESCAPED_UNICODE),
        ]);
    }

    public function hasTemplate(array $notification): bool
    {
        return str_starts_with(trim((string) ($notification['twilio_content_sid'] ?? '')), 'HX');
    }

    public function testConnection(): array
    {
        if (! $this->settings->isConfigured()) {
            return ['ok' => false, 'message' => 'أكمل Account SID و Auth Token ورقم واتساب Twilio.'];
        }

        try {
            $response = $this->client()->get('/Accounts/'.$this->accountSid().'.json');
        } catch (ConnectionException $e) {
            return ['ok' => false, 'message' => 'تعذّر الاتصال بـ Twilio: '.$e->getMessage()];
        }

        if (! $response->successful()) {
            return ['ok' => false, 'message' => 'رفض Twilio البيانات: '.($response->json('message') ?? "HTTP {$response->status()}")];
        }

        return ['ok' => true, 'message' => 'تم الربط بحساب Twilio: '.$response->json('friendly_name', $this->accountSid())];
    }

    public function verifySignature(Request $request): bool
    {
        if (! $this->settings->get('twilio.validate_signature', true)) {
            return true;
        }

        $token = $this->settings->secret('twilio', 'auth_token');
        $signature = (string) $request->header('X-Twilio-Signature', '');
        if ($token === null || $signature === '') {
            return false;
        }

        // https://www.twilio.com/docs/usage/security#validating-requests
        $params = $request->post();
        ksort($params);
        $data = $request->fullUrl();
        foreach ($params as $key => $value) {
            $data .= $key.(is_array($value) ? implode('', $value) : $value);
        }

        return hash_equals(base64_encode(hash_hmac('sha1', $data, $token, true)), $signature);
    }

    public function parseWebhook(Request $request): array
    {
        // Delivery status callback
        // (inbound messages always carry a Body parameter, even when empty; status callbacks don't)
        if ($request->filled('MessageStatus') && ! $request->has('Body') && (int) $request->input('NumMedia', 0) === 0) {
            $status = self::STATUSES[(string) $request->input('MessageStatus')] ?? null;

            return [
                'messages' => [],
                'statuses' => $status ? [new StatusUpdate((string) $request->input('MessageSid'), $status, $request->input('ErrorMessage') ?: null)] : [],
            ];
        }

        $from = PhoneNumber::normalize((string) $request->input('From', ''));
        if ($from === '' || ! $request->filled('MessageSid')) {
            return ['messages' => [], 'statuses' => []];
        }

        $type = (int) $request->input('NumMedia', 0) > 0 ? 'media' : 'text';

        return [
            'messages' => [new InboundMessage($from, $request->input('ProfileName'), (string) $request->input('MessageSid'), $type, $request->input('Body'), $request->post())],
            'statuses' => [],
        ];
    }

    /**
     * @param  array<string, string>  $fields
     */
    private function send(string $toE164, array $fields): SendResult
    {
        if (! $this->settings->isConfigured()) {
            return SendResult::failed('بيانات Twilio غير مكتملة');
        }

        try {
            $response = $this->client()->asForm()->post('/Accounts/'.$this->accountSid().'/Messages.json', [
                'From' => $this->whatsappAddress((string) $this->settings->get('twilio.from_number')),
                'To' => 'whatsapp:+'.$toE164,
                'StatusCallback' => route('whatsapp.webhook.twilio'),
            ] + $fields);
        } catch (ConnectionException $e) {
            return SendResult::failed('Connection failed: '.$e->getMessage());
        }

        if (! $response->successful()) {
            return SendResult::failed((string) ($response->json('message') ?? "HTTP {$response->status()}"));
        }

        return new SendResult(true, (string) $response->json('sid'));
    }

    private function whatsappAddress(string $number): string
    {
        $number = str_replace('whatsapp:', '', trim($number));

        return 'whatsapp:+'.ltrim(preg_replace('/[^\d+]/', '', $number) ?? '', '+');
    }

    private function accountSid(): string
    {
        return (string) $this->settings->get('twilio.account_sid', '');
    }

    private function client(): PendingRequest
    {
        return Http::baseUrl(self::API_URL)
            ->withBasicAuth($this->accountSid(), (string) $this->settings->secret('twilio', 'auth_token'))
            ->acceptJson()
            ->timeout(20);
    }
}
