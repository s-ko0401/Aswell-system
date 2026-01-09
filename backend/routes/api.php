<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\TrainingTemplateController;
use App\Http\Controllers\TrainingController;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'success' => true,
        'data' => [
            'status' => 'ok',
        ],
        'meta' => (object) [],
        'message' => '',
    ]);
});

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:api')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

Route::middleware('auth:api')->group(function () {
    // Training Templates
    Route::apiResource('training-templates', TrainingTemplateController::class);

    // Trainings
    Route::apiResource('trainings', TrainingController::class);
    Route::put('training-items/{id}/status', [TrainingController::class, 'updateItemStatus']);

    // Daily Reports
    Route::get('trainings/{trainingId}/daily-reports', [\App\Http\Controllers\TrainingDailyReportController::class, 'index']);
    Route::post('trainings/{trainingId}/daily-reports', [\App\Http\Controllers\TrainingDailyReportController::class, 'store']);
    Route::get('daily-reports/{id}', [\App\Http\Controllers\TrainingDailyReportController::class, 'show']);
    Route::put('daily-reports/{id}', [\App\Http\Controllers\TrainingDailyReportController::class, 'update']);
    Route::delete('daily-reports/{id}', [\App\Http\Controllers\TrainingDailyReportController::class, 'destroy']);

    // User Selection
    Route::get('/users/selection', [UserController::class, 'selection']);
});

Route::middleware(['auth:api', 'admin'])->group(function () {
    Route::get('/users', [UserController::class, 'index']);
    Route::post('/users', [UserController::class, 'store']);
    Route::put('/users/{id}', [UserController::class, 'update']);
    Route::delete('/users/{id}', [UserController::class, 'destroy']);
});
