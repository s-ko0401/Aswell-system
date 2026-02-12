<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\UpdatePasswordRequest;
use App\Services\Auth\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(private AuthService $authService)
    {
    }

    public function login(LoginRequest $request): JsonResponse
    {
        return $this->authService->login($request);
    }

    public function me(): JsonResponse
    {
        return $this->authService->me();
    }

    public function logout(Request $request): JsonResponse
    {
        return $this->authService->logout($request);
    }

    public function updatePassword(UpdatePasswordRequest $request): JsonResponse
    {
        return $this->authService->updatePassword($request);
    }
}
