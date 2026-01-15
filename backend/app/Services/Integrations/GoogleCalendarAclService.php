<?php

namespace App\Services\Integrations;

use App\Models\CalendarAcl;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GoogleCalendarAclService
{
    private const PROVIDER = 'google';

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $viewerIds = CalendarAcl::query()
            ->where('owner_user_id', $user->id)
            ->where('provider', self::PROVIDER)
            ->pluck('viewer_user_id')
            ->all();

        return response()->json([
            'success' => true,
            'data' => [
                'viewer_ids' => $viewerIds,
            ],
            'message' => '',
        ]);
    }

    public function users(): JsonResponse
    {
        $users = User::query()
            ->orderBy('username')
            ->get(['id', 'username', 'email']);

        return response()->json([
            'success' => true,
            'data' => [
                'users' => $users,
            ],
            'message' => '',
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'viewer_ids' => ['array'],
            'viewer_ids.*' => ['integer', 'exists:users,id'],
        ]);

        $viewerIds = collect($validated['viewer_ids'] ?? [])
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->reject(fn ($id) => $id === (int) $user->id)
            ->unique()
            ->values();

        DB::transaction(function () use ($user, $viewerIds) {
            CalendarAcl::query()
                ->where('owner_user_id', $user->id)
                ->where('provider', self::PROVIDER)
                ->delete();

            if ($viewerIds->isEmpty()) {
                return;
            }

            $rows = $viewerIds->map(fn ($viewerId) => [
                'owner_user_id' => $user->id,
                'viewer_user_id' => $viewerId,
                'provider' => self::PROVIDER,
                'created_at' => now(),
                'updated_at' => now(),
            ])->all();

            CalendarAcl::insert($rows);
        });

        return response()->json([
            'success' => true,
            'data' => [
                'viewer_ids' => $viewerIds,
            ],
            'message' => '',
        ]);
    }
}
