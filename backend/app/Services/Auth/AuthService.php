<?php

namespace App\Services\Auth;

use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\JsonResponse;

class AuthService
{
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

        return response()->json([
            'success' => true,
            'data' => [
                'access_token' => $token,
                'token_type' => 'Bearer',
                'expires_in' => auth('api')->factory()->getTTL() * 60,
                'user' => $this->userPayload(auth('api')->user()),
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

    public function logout(): JsonResponse
    {
        auth('api')->logout();

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
        ];
    }
}
