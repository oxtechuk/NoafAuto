<?php

declare(strict_types=1);

namespace App\Modules\WhatsApp\Services;

use App\Modules\WhatsApp\Drivers\MetaCloudDriver;
use App\Modules\WhatsApp\Models\WhatsAppTemplate;
use Illuminate\Support\Facades\DB;

/**
 * Mirrors the WhatsApp Business account's message templates locally (name, category, approval status).
 */
class TemplateSync
{
    public function __construct(private readonly MetaCloudDriver $driver) {}

    /**
     * @return array{ok: bool, message: string, count?: int}
     */
    public function sync(): array
    {
        $result = $this->driver->fetchTemplates();

        if (! $result['ok']) {
            return ['ok' => false, 'message' => $result['message'] ?? 'تعذّرت المزامنة'];
        }

        $now = now();
        $keep = [];

        DB::transaction(function () use ($result, $now, &$keep): void {
            foreach ($result['templates'] as $template) {
                $name = (string) ($template['name'] ?? '');
                $language = (string) ($template['language'] ?? '');
                if ($name === '' || $language === '') {
                    continue;
                }

                $model = WhatsAppTemplate::query()->updateOrCreate(['name' => $name, 'language' => $language], [
                    'provider_template_id' => isset($template['id']) ? (string) $template['id'] : null,
                    'category' => isset($template['category']) ? strtolower((string) $template['category']) : null,
                    'status' => isset($template['status']) ? strtolower((string) $template['status']) : null,
                    'rejected_reason' => ($template['rejected_reason'] ?? 'NONE') !== 'NONE' ? mb_substr((string) $template['rejected_reason'], 0, 255) : null,
                    'components' => $template['components'] ?? [],
                    'synced_at' => $now,
                ]);
                $keep[] = $model->id;
            }

            // Templates deleted in Meta disappear locally too.
            WhatsAppTemplate::query()->whereNotIn('id', $keep)->delete();
        });

        return ['ok' => true, 'message' => 'تمت مزامنة '.count($keep).' قالب من Meta', 'count' => count($keep)];
    }
}
