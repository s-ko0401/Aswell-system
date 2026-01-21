<?php

namespace App\Http\Controllers\Trainings;

use App\Http\Controllers\Controller;
use App\Services\Trainings\TrainingItemService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TrainingItemController extends Controller
{
    public function __construct(private TrainingItemService $trainingItemService)
    {
    }

    public function storeMajor(Request $request, int $trainingId): JsonResponse
    {
        return $this->trainingItemService->storeMajor($request, $trainingId);
    }

    public function updateMajor(Request $request, int $id): JsonResponse
    {
        return $this->trainingItemService->updateMajor($request, $id);
    }

    public function destroyMajor(Request $request, int $id): JsonResponse
    {
        return $this->trainingItemService->destroyMajor($request, $id);
    }

    public function moveMajor(Request $request, int $id): JsonResponse
    {
        return $this->trainingItemService->moveMajor($request, $id);
    }

    public function storeMiddle(Request $request, int $majorId): JsonResponse
    {
        return $this->trainingItemService->storeMiddle($request, $majorId);
    }

    public function updateMiddle(Request $request, int $id): JsonResponse
    {
        return $this->trainingItemService->updateMiddle($request, $id);
    }

    public function destroyMiddle(Request $request, int $id): JsonResponse
    {
        return $this->trainingItemService->destroyMiddle($request, $id);
    }

    public function moveMiddle(Request $request, int $id): JsonResponse
    {
        return $this->trainingItemService->moveMiddle($request, $id);
    }

    public function storeMinor(Request $request, int $middleId): JsonResponse
    {
        return $this->trainingItemService->storeMinor($request, $middleId);
    }

    public function updateMinor(Request $request, int $id): JsonResponse
    {
        return $this->trainingItemService->updateMinor($request, $id);
    }

    public function destroyMinor(Request $request, int $id): JsonResponse
    {
        return $this->trainingItemService->destroyMinor($request, $id);
    }

    public function moveMinor(Request $request, int $id): JsonResponse
    {
        return $this->trainingItemService->moveMinor($request, $id);
    }
}
