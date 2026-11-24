<?php

namespace App\Services\Infrastructure;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Minimal Cloudflare API v4 client: token check, zone info, cache purge and the edge IP list.
 * The token needs "Zone: Read" and "Cache Purge: Purge" on the zone.
 */
class CloudflareClient
{
    private const BASE_URL = 'https://api.cloudflare.com/client/v4';

    /**
     * Published Cloudflare edge ranges (https://www.cloudflare.com/ips/), used when the live list
     * can't be fetched. They change rarely; the live list replaces them whenever settings are saved.
     */
    public const FALLBACK_IPS = [
        '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22', '141.101.64.0/18',
        '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20', '197.234.240.0/22', '198.41.128.0/17',
        '162.158.0.0/15', '104.16.0.0/13', '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
        '2400:cb00::/32', '2606:4700::/32', '2803:f800::/32', '2405:b500::/32', '2405:8100::/32',
        '2a06:98c0::/29', '2c0f:f248::/32',
    ];

    /**
     * Check the token can read the zone.
     *
     * @return array{name: string, status: string, plan: ?string}
     *
     * @throws RuntimeException with a message fit for the admin UI
     */
    public function zone(string $zoneId, string $token): array
    {
        $result = $this->result($this->request($token)->get(self::BASE_URL.'/zones/'.rawurlencode($zoneId)));

        return [
            'name' => (string) ($result['name'] ?? ''),
            'status' => (string) ($result['status'] ?? ''),
            'plan' => isset($result['plan']['name']) ? (string) $result['plan']['name'] : null,
        ];
    }

    /** @throws RuntimeException */
    public function purgeEverything(string $zoneId, string $token): void
    {
        $this->result($this->request($token)->post(
            self::BASE_URL.'/zones/'.rawurlencode($zoneId).'/purge_cache',
            ['purge_everything' => true],
        ));
    }

    /**
     * Current Cloudflare edge ranges, or the built-in list when the API can't be reached.
     *
     * @return list<string>
     */
    public function edgeIps(): array
    {
        try {
            $response = Http::timeout(5)->acceptJson()->get(self::BASE_URL.'/ips');
            $result = $response->successful() ? (array) $response->json('result') : [];
            $ips = array_values(array_merge((array) ($result['ipv4_cidrs'] ?? []), (array) ($result['ipv6_cidrs'] ?? [])));

            return $ips !== [] ? array_map('strval', $ips) : self::FALLBACK_IPS;
        } catch (ConnectionException) {
            return self::FALLBACK_IPS;
        }
    }

    private function request(string $token): PendingRequest
    {
        return Http::timeout(10)->acceptJson()->withToken($token);
    }

    /**
     * @return array<string, mixed>
     *
     * @throws RuntimeException
     */
    private function result(Response $response): array
    {
        if ($response->successful() && $response->json('success') === true) {
            return (array) $response->json('result');
        }

        $error = $response->json('errors.0.message');

        throw new RuntimeException(match (true) {
            $response->status() === 401, $response->status() === 403 => 'رفض Cloudflare التوكن. تأكد من صلاحيات Zone Read و Cache Purge.',
            $response->status() === 404 => 'لم يتم العثور على الـ Zone. راجع الـ Zone ID.',
            is_string($error) && $error !== '' => 'Cloudflare: '.$error,
            default => 'تعذر الاتصال بـ Cloudflare (HTTP '.$response->status().').',
        });
    }
}
