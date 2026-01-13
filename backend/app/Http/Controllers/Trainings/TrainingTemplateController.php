<?php

namespace App\Http\Controllers\Trainings;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTrainingTemplateRequest;
use App\Http\Requests\UpdateTrainingTemplateRequest;
use App\Services\Trainings\TrainingTemplateService;
use Illuminate\Http\JsonResponse;

class TrainingTemplateController extends Controller
{
    public function __construct(private TrainingTemplateService $trainingTemplateService)
    {
    }

    public function index(): JsonResponse
    {
        return $this->trainingTemplateService->index();
    }

    public function store(StoreTrainingTemplateRequest $request): JsonResponse
    {
        return $this->trainingTemplateService->store($request);
    }

    public function show(string $id): JsonResponse
    {
        return $this->trainingTemplateService->show($id);
    }

    public function update(UpdateTrainingTemplateRequest $request, string $id): JsonResponse
    {
        return $this->trainingTemplateService->update($request, $id);
    }

    public function destroy(string $id): JsonResponse
    {
        return $this->trainingTemplateService->destroy($id);
    }
}
