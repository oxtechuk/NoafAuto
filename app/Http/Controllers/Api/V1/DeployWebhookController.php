<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Api\Contracts\ApiResponse;
use App\Http\Controllers\Api\ApiBaseController;
use App\Services\Updates\UpgradeService;
use Illuminate\Http\Request;
use Symfony\Component\Process\Process;

class DeployWebhookController extends ApiBaseController
{
    /**
     * Handle incoming deployment webhook from CI/CD pipeline.
     */
    public function handle(Request $request, UpgradeService $upgradeService): ApiResponse
    {
        $configuredSecret = (string) config('sitekit.deploy_secret');

        if (empty($configuredSecret)) {
            return $this->respondError('Deploy webhook is disabled or SITEKIT_DEPLOY_SECRET is not configured', 403);
        }

        $providedSecret = (string) ($request->header('X-Deploy-Secret') ?: $request->input('secret'));

        if (! hash_equals($configuredSecret, $providedSecret)) {
            return $this->respondError('Unauthorized: invalid deploy secret', 401);
        }

        $logs = [];

        // 1. Git pull if requested and available
        if ($request->boolean('pull', true)) {
            $gitProcess = Process::fromShellCommandline('git pull origin $(git rev-parse --abbrev-ref HEAD)', base_path());
            $gitProcess->run();
            $logs[] = 'Git: '.trim($gitProcess->getOutput() ?: $gitProcess->getErrorOutput());
        }

        // 2. Run post-deployment upgrade pipeline
        $targetVersion = (string) ($request->input('version') ?: config('sitekit.version', '1.0.0'));
        $upgradeResult = $upgradeService->execute($targetVersion, false, function (string $msg) use (&$logs) {
            $logs[] = $msg;
        });

        if (! $upgradeResult['success']) {
            return $this->respond(
                data: [
                    'success' => false,
                    'version' => $targetVersion,
                    'error' => $upgradeResult['error'],
                    'logs' => $logs,
                ],
                message: 'Auto-deployment completed with errors',
                status: 500,
            );
        }

        return $this->respondSuccess([
            'version' => $targetVersion,
            'deployed_at' => now()->toIso8601String(),
            'logs' => $logs,
        ], 'Instance updated successfully');
    }
}
