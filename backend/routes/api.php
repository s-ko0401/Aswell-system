<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\AuthLogController;
use App\Http\Controllers\Calendars\CompanyCalendarController;
use App\Http\Controllers\Integrations\GoogleCalendarAclController;
use App\Http\Controllers\Integrations\GoogleIntegrationController;
use App\Http\Controllers\Integrations\IntegrationController;
use App\Http\Controllers\Trainings\TrainingController;
use App\Http\Controllers\Trainings\TrainingDailyReportController;
use App\Http\Controllers\Trainings\TrainingTemplateController;
use App\Http\Controllers\Users\UserController;
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

Route::post('/calendars/company/refresh-scheduler', [CompanyCalendarController::class, 'refreshScheduler']);
Route::get('/integrations/google/callback', [GoogleIntegrationController::class, 'callback']);

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:api')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

Route::middleware('auth:api')->group(function () {
    Route::get('/integrations/status', [IntegrationController::class, 'status']);
    Route::get('/integrations/google/authorize', [GoogleIntegrationController::class, 'authorize']);
    Route::get('/integrations/google/events', [GoogleIntegrationController::class, 'events']);
    Route::delete('/integrations/google', [GoogleIntegrationController::class, 'disconnect']);
    Route::get('/integrations/google/acl', [GoogleCalendarAclController::class, 'index']);
    Route::get('/integrations/google/acl/users', [GoogleCalendarAclController::class, 'users']);
    Route::put('/integrations/google/acl', [GoogleCalendarAclController::class, 'update']);

    Route::middleware('page:trainings')->group(function () {
        // Training Templates
        Route::apiResource('training-templates', TrainingTemplateController::class);

        // Trainings
        Route::apiResource('trainings', TrainingController::class);
        Route::put('training-items/{id}/status', [TrainingController::class, 'updateItemStatus']);

        // Daily Reports
        Route::get('trainings/{trainingId}/daily-reports', [TrainingDailyReportController::class, 'index']);
        Route::post('trainings/{trainingId}/daily-reports', [TrainingDailyReportController::class, 'store']);
        Route::get('daily-reports/{id}', [TrainingDailyReportController::class, 'show']);
        Route::put('daily-reports/{id}', [TrainingDailyReportController::class, 'update']);
        Route::delete('daily-reports/{id}', [TrainingDailyReportController::class, 'destroy']);

        // User Selection
        Route::get('/users/selection', [UserController::class, 'selection']);
    });

    Route::middleware('page:calendars')->group(function () {
        // Company Calendars
        Route::get('/calendars/company', [CompanyCalendarController::class, 'index']);
        Route::get('/calendars/company/events/{eventId}', [CompanyCalendarController::class, 'showEvent']);
        Route::post('/calendars/company/refresh', [CompanyCalendarController::class, 'refresh']);
    });
});

Route::middleware(['auth:api', 'admin'])->group(function () {
    Route::get('/users', [UserController::class, 'index']);
    Route::post('/users', [UserController::class, 'store']);
    Route::put('/users/{id}', [UserController::class, 'update']);
    Route::delete('/users/{id}', [UserController::class, 'destroy']);
    Route::get('/auth-logs', [AuthLogController::class, 'index']);
});
