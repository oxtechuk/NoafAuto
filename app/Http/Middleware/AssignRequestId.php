<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Context;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class AssignRequestId
{
    public const HEADER = 'X-Request-Id';

    /**
     * Tag every request with an ID that is shared with the logs and returned to the client.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $requestId = $this->incomingRequestId($request) ?? (string) Str::uuid();

        Context::add('request_id', $requestId);

        $response = $next($request);

        $response->headers->set(self::HEADER, $requestId);

        return $response;
    }

    /**
     * Accept an upstream ID (e.g. from a load balancer) only when it is safe to log.
     */
    private function incomingRequestId(Request $request): ?string
    {
        $requestId = $request->headers->get(self::HEADER);

        if (is_string($requestId) && preg_match('/^[A-Za-z0-9\-_.]{8,64}$/', $requestId) === 1) {
            return $requestId;
        }

        return null;
    }
}
