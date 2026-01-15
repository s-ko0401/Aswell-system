<?php

namespace App\Http\Middleware;

use App\Support\PagePermissions;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePagePermission
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next, string $page): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'UNAUTHORIZED',
                    'message' => 'Unauthorized',
                    'details' => (object) [],
                ],
            ], 401);
        }

        if (!PagePermissions::canAccess($user, $page)) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'FORBIDDEN',
                    'message' => 'Forbidden',
                    'details' => (object) [],
                ],
            ], 403);
        }

        return $next($request);
    }
}
