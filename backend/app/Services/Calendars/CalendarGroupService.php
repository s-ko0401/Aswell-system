<?php

namespace App\Services\Calendars;

use App\Models\CalendarGroup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CalendarGroupService
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $groups = CalendarGroup::query()
            ->where('user_id', $user->id)
            ->orderBy('name')
            ->with(['members' => function ($query) {
                $query->orderBy('username')->select(['users.id', 'users.username', 'users.email', 'users.role']);
            }])
            ->get(['id', 'user_id', 'name']);

        $payload = $groups->map(fn (CalendarGroup $group) => [
            'id' => $group->id,
            'name' => $group->name,
            'member_user_ids' => $group->members->pluck('id')->values(),
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'groups' => $payload,
            ],
            'message' => '',
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:100',
                Rule::unique('calendar_groups', 'name')->where('user_id', $user->id),
            ],
        ]);

        $group = CalendarGroup::create([
            'user_id' => $user->id,
            'name' => $validated['name'],
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $group->id,
                'name' => $group->name,
                'member_user_ids' => [],
            ],
            'message' => '',
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $group = CalendarGroup::query()
            ->where('user_id', $user->id)
            ->findOrFail($id);

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:100',
                Rule::unique('calendar_groups', 'name')
                    ->where('user_id', $user->id)
                    ->ignore($group->id),
            ],
        ]);

        $group->update(['name' => $validated['name']]);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $group->id,
                'name' => $group->name,
                'member_user_ids' => $group->members()->pluck('users.id')->values(),
            ],
            'message' => '',
        ]);
    }

    public function updateMembers(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $group = CalendarGroup::query()
            ->where('user_id', $user->id)
            ->findOrFail($id);

        $validated = $request->validate([
            'member_user_ids' => ['array'],
            'member_user_ids.*' => ['integer', 'exists:users,id'],
        ]);

        $memberIds = collect($validated['member_user_ids'] ?? [])
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        DB::transaction(function () use ($group, $memberIds) {
            $group->members()->sync($memberIds);
        });

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $group->id,
                'name' => $group->name,
                'member_user_ids' => $memberIds,
            ],
            'message' => '',
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $group = CalendarGroup::query()
            ->where('user_id', $user->id)
            ->findOrFail($id);

        $group->delete();

        return response()->json([
            'success' => true,
            'data' => [],
            'message' => '',
        ]);
    }
}
