<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureEmployeeIsActive
{
    /**
     * End the session of an employee who was deactivated while logged in.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $employee = $request->user('employee');

        if ($employee === null || $employee->is_active) {
            return $next($request);
        }

        Auth::guard('employee')->logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        if ($request->expectsJson() || $request->is('api/*')) {
            return response()->json([
                'success' => false,
                'message' => 'Account is inactive',
                'data' => null,
                'errors' => null,
                'meta' => null,
            ], 401);
        }

        return redirect()->route('crm.login')->withErrors([
            'username' => __('auth.failed'),
        ]);
    }
}
