<?php

namespace App\Http\Controllers\Trainings;

use App\Http\Controllers\Controller;
use App\Services\Trainings\TrainingDailyReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TrainingDailyReportController extends Controller
{
    public function __construct(private TrainingDailyReportService $trainingDailyReportService)
    {
    }

    public function index(string $trainingId): JsonResponse
    {
        return $this->trainingDailyReportService->index($trainingId);
    }

    public function show(string $id): JsonResponse
    {
        return $this->trainingDailyReportService->show($id);
    }

    public function store(Request $request, string $trainingId): JsonResponse
    {
        return $this->trainingDailyReportService->store($request, $trainingId);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        return $this->trainingDailyReportService->update($request, $id);
    }

    public function destroy(string $id): JsonResponse
    {
        return $this->trainingDailyReportService->destroy($id);
    }
}
