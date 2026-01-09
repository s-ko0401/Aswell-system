<?php

namespace App\Http\Controllers;

use App\Http\Requests\Users\StoreUserRequest;
use App\Http\Requests\Users\UpdateUserRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index(): JsonResponse
    {
        $perPage = (int) request()->query('per_page', 20);
        $perPage = min(max($perPage, 1), 100);

        $paginator = User::query()->orderBy('id')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => collect($paginator->items())->map(fn(User $user) => $this->userPayload($user)),
            'meta' => [
                'page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
            'message' => '',
        ]);
    }

    public function selection(): JsonResponse
    {
        $users = User::query()->orderBy('username')->get(['id', 'username']);

        return response()->json([
            'success' => true,
            'data' => $users,
            'message' => '',
        ]);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = User::create([
            'username' => $request->input('username'),
            'email' => $request->input('email'),
            'loginid' => $request->input('loginid'),
            'password' => Hash::make($request->input('password')),
            'role' => (int) $request->input('role'),
        ]);

        return response()->json([
            'success' => true,
            'data' => $this->userPayload($user),
            'message' => '',
        ], 201);
    }

    public function update(UpdateUserRequest $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        $user->username = $request->input('username');
        $user->email = $request->input('email');
        $user->loginid = $request->input('loginid');
        $user->role = (int) $request->input('role');

        if ($request->filled('password')) {
            $user->password = Hash::make($request->input('password'));
        }

        $user->save();

        return response()->json([
            'success' => true,
            'data' => $this->userPayload($user),
            'message' => '',
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $user = User::findOrFail($id);
        $user->delete();

        return response()->json([
            'success' => true,
            'data' => [],
            'message' => '',
        ]); // 200 OK with body is safer for "Unified format" rule than 204
    }

    private function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'username' => $user->username,
            'email' => $user->email,
            'loginid' => $user->loginid,
            'role' => (int) $user->role,
            'created_at' => $user->created_at?->toIso8601String(),
            'updated_at' => $user->updated_at?->toIso8601String(),
        ];
    }
}
