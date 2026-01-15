<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\Auth\AuthLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthLogController extends Controller
{
    public function __construct(private AuthLogService $authLogService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        return $this->authLogService->index($request);
    }
}
