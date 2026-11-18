<?php

declare(strict_types=1);

namespace App\Http\Api\Exceptions\Handlers;

use App\Http\Api\Contracts\ApiResponse;
use App\Http\Api\Exceptions\ApiException;
use App\Http\Api\Response\Builder\ApiResponseBuilder;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException as LaravelValidationException;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

final class GlobalExceptionHandler
{
    public function __construct(
        private readonly ApiResponseBuilder $builder,
    ) {}

    public function render(\Throwable $e, Request $request): ?Response
    {
        if (! $request->expectsJson() && ! $request->is('api/*') && ! $request->is('erp/*')) {
            return null;
        }

        if ($e instanceof HttpResponseException) {
            return $e->getResponse();
        }

        $response = match (true) {
            $e instanceof ApiException => $this->handleApiException($e),
            $e instanceof LaravelValidationException => $this->handleValidationException($e),
            $e instanceof AuthenticationException => $this->error('Unauthenticated', 401),
            $e instanceof ModelNotFoundException, $e instanceof NotFoundHttpException => $this->error('Resource not found', 404),
            $e instanceof AuthorizationException, $e instanceof AccessDeniedHttpException => $this->error('Forbidden', 403),
            $e instanceof HttpException => $this->error($e->getMessage() ?: 'HTTP error', $e->getStatusCode(), $e->getHeaders()),
            default => $this->handleGenericException($e),
        };

        return $response;
    }

    private function handleApiException(ApiException $e): JsonResponse
    {
        $response = $this->builder
            ->success(false)
            ->message($e->getMessage())
            ->status($e->getStatusCode());

        if ($e->getDetails() !== null) {
            $response->errors($e->getDetails());
        }

        return $this->toJson($response->build());
    }

    private function handleValidationException(LaravelValidationException $e): JsonResponse
    {
        return $this->toJson($this->builder
            ->success(false)
            ->message('Validation failed')
            ->errors($e->errors())
            ->status(422)
            ->build());
    }

    /**
     * @param  array<string, string>  $headers
     */
    private function error(string $message, int $status, array $headers = []): JsonResponse
    {
        return $this->toJson($this->builder
            ->success(false)
            ->message($message)
            ->status($status)
            ->build())
            ->withHeaders($headers);
    }

    private function toJson(ApiResponse $response): JsonResponse
    {
        return response()->json($response->toArray(), $response->getStatusCode());
    }

    private function handleGenericException(\Throwable $e): JsonResponse
    {
        logger()->error($e->getMessage(), [
            'exception' => $e::class,
            'file' => $e->getFile(),
            'line' => $e->getLine(),
        ]);

        if (config('app.debug')) {
            return $this->toJson($this->builder
                ->success(false)
                ->message($e->getMessage())
                ->data([
                    'exception' => $e::class,
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'trace' => $e->getTraceAsString(),
                ])
                ->status(500)
                ->build());
        }

        return $this->error('Internal server error', 500);
    }
}
