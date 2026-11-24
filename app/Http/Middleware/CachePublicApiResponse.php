<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CachePublicApiResponse
{
    /**
     * Let browsers (and a CDN in front of the site) reuse public, read-only store responses.
     *
     * Only successful GET/HEAD responses to anonymous requests are marked cacheable. They vary by
     * Accept-Language because the store API translates per locale. After it expires, a response may be
     * served stale for a while longer while a fresh copy is fetched in the background.
     *
     * Usage: ->middleware('cache.public:60') (max-age in seconds).
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, int $maxAge = 60): Response
    {
        $response = $next($request);

        if (! $this->isCacheable($request, $response)) {
            return $response;
        }

        $response->headers->set(
            'Cache-Control',
            sprintf('public, max-age=%d, stale-while-revalidate=%d', $maxAge, $maxAge * 5)
        );
        $response->setVary(array_unique([...$response->getVary(), 'Accept-Language']));

        return $response;
    }

    private function isCacheable(Request $request, Response $response): bool
    {
        return $request->isMethodCacheable()
            && $response->getStatusCode() === Response::HTTP_OK
            && ! $request->headers->has('Authorization')
            && ! $response->headers->has('Set-Cookie');
    }
}
