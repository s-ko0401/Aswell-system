<?php

namespace App\Services\Auth;

use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\UpdatePasswordRequest;
use App\Support\PagePermissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthService
{
    public function __construct(private AuthLogService $authLogService)
    {
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->only(['loginid', 'password']);

        if (!$token = auth('api')->attempt($credentials)) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'UNAUTHORIZED',
                    'message' => 'Unauthorized',
                    'details' => (object) [],
                ],
            ], 401);
        }

        $user = auth('api')->user();
        $this->authLogService->record($user->id, AuthLogService::ACTION_LOGIN, $request);

        return response()->json([
            'success' => true,
            'data' => [
                'access_token' => $token,
                'token_type' => 'Bearer',
                'expires_in' => auth('api')->factory()->getTTL() * 60,
                'user' => $this->userPayload($user),
            ],
            'message' => '',
        ]);
    }

    public function me(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->userPayload(auth('api')->user()),
            'message' => '',
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = auth('api')->user();
        if ($user) {
            $this->authLogService->record($user->id, AuthLogService::ACTION_LOGOUT, $request);
        }

        auth('api')->logout();

        return response()->json([
            'success' => true,
            'data' => (object) [],
            'message' => '',
        ]);
    }

    public function updatePassword(UpdatePasswordRequest $request): JsonResponse
    {
        $user = auth('api')->user();

        if (!$user || !Hash::check($request->input('current_password'), $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['現在のパスワードが正しくありません。'],
            ]);
        }

        $user->password = Hash::make($request->input('new_password'));
        $user->save();

        return response()->json([
            'success' => true,
            'data' => (object) [],
            'message' => '',
        ]);
    }

    private function userPayload($user): array
    {
        return [
            'id' => $user->id,
            'username' => $user->username,
            'email' => $user->email,
            'loginid' => $user->loginid,
            'role' => (int) $user->role,
            'page_permissions' => PagePermissions::resolve($user),
        ];
    }
}
