<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Api\Contracts\ApiResponse;
use App\Http\Api\Response\Builder\ApiResponseBuilder;
use App\Http\Controllers\Api\ApiBaseController;
use App\Models\Employee;
use App\Services\Modules\ModuleManager;
use Illuminate\Http\Request;

class ModuleController extends ApiBaseController
{
    public function __construct(
        ApiResponseBuilder $responseBuilder,
        private readonly ModuleManager $moduleManager,
    ) {
        parent::__construct($responseBuilder);
    }

    public function index(Request $request): ApiResponse
    {
        $this->authorizeAdmin($request);

        $modules = $this->moduleManager->all()->values();

        return $this->respondSuccess($modules, 'Modules retrieved successfully');
    }

    public function enable(Request $request, string $key): ApiResponse
    {
        $this->authorizeAdmin($request);

        $success = $this->moduleManager->enable($key);
        if (! $success) {
            return $this->respondError("Module [{$key}] could not be found", 404);
        }

        return $this->respondSuccess(
            $this->moduleManager->find($key),
            "Module [{$key}] enabled successfully"
        );
    }

    public function disable(Request $request, string $key): ApiResponse
    {
        $this->authorizeAdmin($request);

        $success = $this->moduleManager->disable($key);
        if (! $success) {
            return $this->respondError("Module [{$key}] could not be found", 404);
        }

        return $this->respondSuccess(
            $this->moduleManager->find($key),
            "Module [{$key}] disabled successfully"
        );
    }

    private function authorizeAdmin(Request $request): void
    {
        /** @var Employee|null $employee */
        $employee = $request->user('employee');

        if (! $employee || ! $employee->isAdmin()) {
            abort(403, 'Unauthorized. Admin access required.');
        }
    }
}
