<?php

namespace App\Http\Controllers\Users;

use App\Http\Controllers\Controller;
use App\Http\Requests\Users\StoreUserRequest;
use App\Http\Requests\Users\UpdateUserRequest;
use App\Services\Users\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function __construct(private UserService $userService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        return $this->userService->index($request);
    }

    public function selection(): JsonResponse
    {
        return $this->userService->selection();
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        return $this->userService->store($request);
    }

    public function update(UpdateUserRequest $request, int $id): JsonResponse
    {
        return $this->userService->update($request, $id);
    }

    public function destroy(int $id): JsonResponse
    {
        return $this->userService->destroy($id);
    }
}
