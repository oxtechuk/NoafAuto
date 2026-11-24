<?php

declare(strict_types=1);

namespace App\Modules\WhatsApp\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\WhatsApp\Services\InboundProcessor;
use App\Modules\WhatsApp\Services\WhatsAppManager;
use App\Modules\WhatsApp\Services\WhatsAppSettings;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

/**
 * Public webhooks called by Meta / Twilio. Every request is signature-checked.
 */
class WebhookController extends Controller
{
    /** Meta subscription check: GET ?hub.mode=subscribe&hub.verify_token=…&hub.challenge=… */
    public function metaVerify(Request $request, WhatsAppSettings $settings): Response
    {
        $token = (string) $request->query('hub_verify_token', $request->query('hub.verify_token', ''));
        $mode = (string) $request->query('hub_mode', $request->query('hub.mode', ''));

        if ($mode === 'subscribe' && $token !== '' && hash_equals((string) $settings->get('meta.verify_token'), $token)) {
            return response((string) $request->query('hub_challenge', $request->query('hub.challenge', '')), 200)->header('Content-Type', 'text/plain');
        }

        return response('Forbidden', 403);
    }

    public function meta(Request $request, WhatsAppManager $manager, InboundProcessor $processor): Response
    {
        return $this->receive($request, $manager, $processor, 'meta');
    }

    public function twilio(Request $request, WhatsAppManager $manager, InboundProcessor $processor): Response
    {
        return $this->receive($request, $manager, $processor, 'twilio');
    }

    private function receive(Request $request, WhatsAppManager $manager, InboundProcessor $processor, string $provider): Response
    {
        $driver = $manager->driver($provider);

        if (! $driver->verifySignature($request)) {
            Log::warning("WhatsApp {$provider} webhook rejected: invalid signature", ['ip' => $request->ip()]);

            return response('Invalid signature', 401);
        }

        $events = $driver->parseWebhook($request);

        foreach ($events['statuses'] as $status) {
            $processor->handleStatus($status);
        }
        foreach ($events['messages'] as $message) {
            $processor->handleMessage($message);
        }

        // Twilio expects TwiML (empty = no automatic reply); Meta only needs a 200.
        return $provider === 'twilio'
            ? response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', 200)->header('Content-Type', 'text/xml')
            : response('OK', 200);
    }
}
