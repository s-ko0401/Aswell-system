<?php

namespace App\Http\Controllers\Trainings;

use App\Http\Controllers\Controller;
use App\Services\Trainings\TrainingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TrainingController extends Controller
{
    public function __construct(private TrainingService $trainingService)
    {
    }

    public function index(): JsonResponse
    {
        return $this->trainingService->index();
    }

    public function store(Request $request): JsonResponse
    {
        return $this->trainingService->store($request);
    }

    public function show(string $id): JsonResponse
    {
        return $this->trainingService->show($id);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        return $this->trainingService->update($request, $id);
    }

    public function destroy(string $id): JsonResponse
    {
        return $this->trainingService->destroy($id);
    }

    public function updateItemStatus(Request $request, $itemId): JsonResponse
    {
        return $this->trainingService->updateItemStatus($request, $itemId);
    }
}
