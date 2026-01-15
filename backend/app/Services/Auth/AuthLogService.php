<?php

namespace App\Services\Auth;

use App\Models\AuthLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthLogService
{
    public const ACTION_LOGIN = 'login';
    public const ACTION_LOGOUT = 'logout';

    public function record(int $userId, string $action, Request $request): void
    {
        AuthLog::create([
            'user_id' => $userId,
            'action' => $action,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 20);
        $perPage = min(max($perPage, 1), 100);

        $paginator = AuthLog::query()
            ->with(['user:id,username,email'])
            ->orderByDesc('created_at')
            ->paginate($perPage);

        $items = collect($paginator->items())->map(fn(AuthLog $log) => [
            'id' => $log->id,
            'action' => $log->action,
            'ip_address' => $log->ip_address,
            'user_agent' => $log->user_agent,
            'created_at' => $log->created_at?->toIso8601String(),
            'user' => $log->user ? [
                'id' => $log->user->id,
                'username' => $log->user->username,
                'email' => $log->user->email,
            ] : null,
        ]);

        return response()->json([
            'success' => true,
            'data' => $items,
            'meta' => [
                'page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
            'message' => '',
        ]);
    }
}
