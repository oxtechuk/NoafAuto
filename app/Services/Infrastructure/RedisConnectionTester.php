<?php

namespace App\Services\Infrastructure;

use Illuminate\Contracts\Foundation\Application;
use Illuminate\Redis\RedisManager;
use Throwable;

/**
 * Tries a Redis connection on a throwaway manager, so a bad config never touches the live one.
 */
class RedisConnectionTester
{
    public function __construct(private readonly Application $app) {}

    /**
     * @param  array<string, mixed>  $connection  Laravel Redis connection config
     * @return array{ok: bool, message: string, version: ?string, client: ?string}
     */
    public function test(array $connection): array
    {
        $client = InfrastructureConfigurator::availableRedisClient();

        if ($client === null) {
            return [
                'ok' => false,
                'message' => 'لا يوجد عميل Redis في PHP على هذا السيرفر. ثبّت امتداد ext-redis (phpredis) من لوحة الاستضافة.',
                'version' => null,
                'client' => null,
            ];
        }

        try {
            $manager = new RedisManager($this->app, $client, ['options' => ['prefix' => ''], 'probe' => $connection]);
            $redis = $manager->connection('probe');
            $redis->command('ping');
            $info = (array) $redis->command('info', ['server']);
            $version = $info['redis_version'] ?? ($info['Server']['redis_version'] ?? null);
            $manager->purge('probe');

            return [
                'ok' => true,
                'message' => 'تم الاتصال بـ Redis بنجاح.',
                'version' => is_string($version) ? $version : null,
                'client' => $client,
            ];
        } catch (Throwable $exception) {
            $message = $exception->getMessage();

            return [
                'ok' => false,
                'message' => match (true) {
                    str_contains(strtolower($message), 'auth') || str_contains($message, 'NOAUTH') || str_contains($message, 'WRONGPASS') => 'كلمة مرور Redis غير صحيحة.',
                    default => 'تعذر الاتصال بـ Redis: '.$message,
                },
                'version' => null,
                'client' => $client,
            ];
        }
    }
}
