<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class MarkDeprecatedApi
{
    /**
     * Flag legacy unversioned API routes and point clients at their /api/v1 successor.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $successor = '/api/v1/'.ltrim((string) preg_replace('#^api/#', '', $request->path()), '/');

        $response->headers->set('Deprecation', 'true');
        $response->headers->set('Link', '<'.$successor.'>; rel="successor-version"');

        return $response;
    }
}
