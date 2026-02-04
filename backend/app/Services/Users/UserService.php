<?php

namespace App\Services\Users;

use App\Http\Requests\Users\StoreUserRequest;
use App\Http\Requests\Users\UpdateUserRequest;
use App\Models\User;
use App\Support\PagePermissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserService
{
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 20);
        $perPage = min(max($perPage, 1), 100);

        $paginator = User::query()
            ->when($request->query('role'), fn($q, $role) => $q->where('role', $role))
            ->when($request->query('search'), fn($q, $search) => $q->where('username', 'like', "%{$search}%"))
            ->orderBy('role')
            ->orderByDesc('created_at')
            ->paginate($perPage);

        $roleCounts = $this->getRoleCounts();
        
        return response()->json([
            'success' => true,
            'data' => collect($paginator->items())->map(fn(User $user) => $this->userPayload($user)),
            'meta' => [
                'page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'roles' => $roleCounts,
            ],
            'message' => '',
        ]);
    }

    private function getRoleCounts(): array
    {
        $roleCounts = User::query()
            ->selectRaw('role, count(*) as count')
            ->groupBy('role')
            ->pluck('count', 'role')
            ->all();

        $perRoles = [];

        // Return valid counts from DB irrespective of Role ID
        foreach ($roleCounts as $roleId => $count) {
            $perRoles[] = [
                'id' => $roleId,
                'count' => $count,
            ];
        }

        return $perRoles;
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
            'staff_number' => $request->input('staff_number'),
            'password' => Hash::make($request->input('password')),
            'role' => (int) $request->input('role'),
            'page_permissions' => $request->input('page_permissions'),
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
        $user->staff_number = $request->input('staff_number');
        $user->role = (int) $request->input('role');

        if ($request->has('page_permissions')) {
            $user->page_permissions = $request->input('page_permissions');
        }

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
        ]);
    }

    private function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'username' => $user->username,
            'email' => $user->email,
            'loginid' => $user->loginid,
            'staff_number' => $user->staff_number,
            'role' => (int) $user->role,
            'page_permissions' => PagePermissions::resolve($user),
            'created_at' => $user->created_at?->toIso8601String(),
            'updated_at' => $user->updated_at?->toIso8601String(),
        ];
    }
}
