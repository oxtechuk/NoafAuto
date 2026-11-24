<?php

declare(strict_types=1);

namespace App\Modules\AiAssistant\Providers;

use App\Modules\AiAssistant\Contracts\LlmProvider;
use App\Modules\AiAssistant\Services\AssistantSettings;
use App\Modules\AiAssistant\Support\AssistantException;
use App\Modules\AiAssistant\Support\LlmResult;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Google Gemini (generateContent, function calling) over REST.
 * Each showroom uses its own API key from the assistant settings.
 */
class GeminiProvider implements LlmProvider
{
    public const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

    public function __construct(private readonly AssistantSettings $settings) {}

    public function name(): string
    {
        return 'gemini';
    }

    public function generate(string $system, array $contents, array $tools, array $options = []): LlmResult
    {
        $model = $options['model'] ?? (string) $this->settings->get('model');

        $body = [
            'systemInstruction' => ['parts' => [['text' => $system]]],
            'contents' => $contents,
        ];

        $genConfig = array_filter([
            'temperature' => $options['temperature'] ?? null,
            'maxOutputTokens' => $options['max_output_tokens'] ?? null,
        ], fn ($value) => $value !== null);

        if ($genConfig !== []) {
            $body['generationConfig'] = (object) $genConfig;
        }

        if ($tools !== []) {
            $body['tools'] = [['functionDeclarations' => $tools]];
            $body['toolConfig'] = ['functionCallingConfig' => ['mode' => $options['tool_mode'] ?? 'AUTO']];
        }

        $modelsToTry = array_values(array_unique(array_filter([
            $model,
            'gemini-flash-lite-latest',
            'gemini-3.5-flash-lite',
        ])));

        $lastException = null;
        $response = null;

        foreach ($modelsToTry as $attemptModel) {
            for ($attempt = 1; $attempt <= 2; $attempt++) {
                try {
                    $response = $this->client()->post('/models/'.rawurlencode($attemptModel).':generateContent', $body);
                } catch (ConnectionException $e) {
                    $lastException = new AssistantException('Gemini connection failed: '.$e->getMessage(), 0, $e);
                    usleep(500000);

                    continue;
                }

                if ($response->successful()) {
                    break 2;
                }

                $status = $response->status();
                $message = (string) ($response->json('error.message') ?? $response->body());
                $lastException = new AssistantException("Gemini HTTP {$status}: {$message}");

                // If 503 (high demand) or 429 (rate limit), pause and retry/failover
                if (in_array($status, [429, 503], true)) {
                    Log::warning("Gemini model {$attemptModel} (attempt {$attempt}) failed with HTTP {$status}: {$message}. Backing off...");
                    usleep(800000);

                    continue;
                }

                if ($status === 404) {
                    break;
                }

                throw $lastException;
            }
        }

        if (! $response || ! $response->successful()) {
            throw $lastException ?? new AssistantException('All Gemini models failed.');
        }

        $candidate = (array) $response->json('candidates.0', []);
        $parts = array_values((array) data_get($candidate, 'content.parts', []));

        $text = '';
        $functionCalls = [];
        foreach ($parts as $part) {
            if (isset($part['text']) && empty($part['thought'])) {
                $text .= $part['text'];
            }
            if (isset($part['functionCall']['name'])) {
                $functionCalls[] = [
                    'id' => $part['functionCall']['id'] ?? null,
                    'name' => (string) $part['functionCall']['name'],
                    'args' => (array) ($part['functionCall']['args'] ?? []),
                ];
            }
        }

        if ($parts === [] && ($blocked = $response->json('promptFeedback.blockReason'))) {
            throw new AssistantException("Gemini blocked the prompt: {$blocked}");
        }

        return new LlmResult(
            text: trim($text),
            functionCalls: $functionCalls,
            rawParts: $parts,
            tokensIn: (int) $response->json('usageMetadata.promptTokenCount', 0),
            tokensOut: (int) $response->json('usageMetadata.candidatesTokenCount', 0) + (int) $response->json('usageMetadata.thoughtsTokenCount', 0),
            finishReason: $candidate['finishReason'] ?? null,
        );
    }

    public function testConnection(?string $apiKey = null): array
    {
        $apiKey ??= $this->settings->apiKey();
        if ($apiKey === null) {
            return ['ok' => false, 'message' => 'لم يتم إدخال مفتاح Gemini API بعد.', 'models' => []];
        }

        try {
            $response = $this->client($apiKey)->get('/models', ['pageSize' => 100]);
        } catch (ConnectionException $e) {
            return ['ok' => false, 'message' => 'تعذّر الاتصال بـ Gemini: '.$e->getMessage(), 'models' => []];
        }

        if (! $response->successful()) {
            return ['ok' => false, 'message' => 'رفض Gemini المفتاح: '.($response->json('error.message') ?? "HTTP {$response->status()}"), 'models' => []];
        }

        $models = collect((array) $response->json('models', []))
            ->filter(fn ($model) => in_array('generateContent', (array) ($model['supportedGenerationMethods'] ?? ['generateContent']), true))
            ->map(fn ($model) => str_replace('models/', '', (string) ($model['name'] ?? '')))
            ->filter(fn (string $name) => str_starts_with($name, 'gemini'))
            ->values()
            ->all();

        return ['ok' => true, 'message' => 'تم الاتصال بنجاح.', 'models' => $models];
    }

    private function client(?string $apiKey = null): PendingRequest
    {
        $apiKey ??= $this->settings->apiKey();
        if ($apiKey === null) {
            throw new AssistantException('Gemini API key is not configured.');
        }

        $caPath = 'C:/wamp64/bin/php/php8.4.15/extras/ssl/cacert.pem';
        $options = file_exists($caPath) ? ['verify' => $caPath] : [];

        return Http::baseUrl(self::BASE_URL)
            ->acceptJson()
            ->asJson()
            ->withOptions($options)
            ->withHeaders(['x-goog-api-key' => $apiKey])
            ->timeout(30);
    }
}
