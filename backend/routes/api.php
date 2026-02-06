<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\AuthLogController;
use App\Http\Controllers\Calendars\CompanyCalendarController;
use App\Http\Controllers\Integrations\GoogleCalendarAclController;
use App\Http\Controllers\Integrations\GoogleIntegrationController;
use App\Http\Controllers\Integrations\IntegrationController;
use App\Http\Controllers\Trainings\TrainingController;
use App\Http\Controllers\Trainings\TrainingDailyReportController;
use App\Http\Controllers\Trainings\TrainingItemController;
use App\Http\Controllers\Trainings\TrainingTemplateController;
use App\Http\Controllers\Users\UserController;
use Illuminate\Support\Facades\Route;

// APIの稼働確認
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

// 
Route::post('/calendars/company/refresh-scheduler', [CompanyCalendarController::class, 'refreshScheduler']);
Route::get('/integrations/google/callback', [GoogleIntegrationController::class, 'callback']);

// 認証
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:api')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

Route::middleware('auth:api')->group(function () {
    // グーグルアカウントとの連携
    Route::get('/integrations/status', [IntegrationController::class, 'status']);
    Route::get('/integrations/google/authorize', [GoogleIntegrationController::class, 'authorize']);
    Route::get('/integrations/google/events', [GoogleIntegrationController::class, 'events']);
    Route::delete('/integrations/google', [GoogleIntegrationController::class, 'disconnect']);
    Route::get('/integrations/google/acl', [GoogleCalendarAclController::class, 'index']);
    Route::get('/integrations/google/acl/users', [GoogleCalendarAclController::class, 'users']);
    Route::put('/integrations/google/acl', [GoogleCalendarAclController::class, 'update']);

    // 研修
    Route::middleware('page:trainings')->group(function () {
        // 研修テンプレートCRUD
        Route::apiResource('training-templates', TrainingTemplateController::class);

        // 研修
        Route::apiResource('trainings', TrainingController::class);
        Route::put('training-items/{id}/status', [TrainingController::class, 'updateItemStatus']);

        // 研修テンプレートの大項目
        Route::post('trainings/{trainingId}/major-items', [TrainingItemController::class, 'storeMajor']);
        Route::patch('training-major-items/{id}', [TrainingItemController::class, 'updateMajor']);
        Route::delete('training-major-items/{id}', [TrainingItemController::class, 'destroyMajor']);
        Route::post('training-major-items/{id}/move', [TrainingItemController::class, 'moveMajor']);

        // 研修テンプレートの中項目
        Route::post('training-major-items/{majorId}/middle-items', [TrainingItemController::class, 'storeMiddle']);
        Route::patch('training-middle-items/{id}', [TrainingItemController::class, 'updateMiddle']);
        Route::delete('training-middle-items/{id}', [TrainingItemController::class, 'destroyMiddle']);
        Route::post('training-middle-items/{id}/move', [TrainingItemController::class, 'moveMiddle']);

        // 研修テンプレートの小項目
        Route::post('training-middle-items/{middleId}/minor-items', [TrainingItemController::class, 'storeMinor']);
        Route::patch('training-minor-items/{id}', [TrainingItemController::class, 'updateMinor']);
        Route::delete('training-minor-items/{id}', [TrainingItemController::class, 'destroyMinor']);
        Route::post('training-minor-items/{id}/move', [TrainingItemController::class, 'moveMinor']);

        // 日報管理
        Route::get('trainings/{trainingId}/daily-reports', [TrainingDailyReportController::class, 'index']);
        Route::post('trainings/{trainingId}/daily-reports', [TrainingDailyReportController::class, 'store']);
        Route::get('daily-reports/{id}', [TrainingDailyReportController::class, 'show']);
        Route::put('daily-reports/{id}', [TrainingDailyReportController::class, 'update']);
        Route::delete('daily-reports/{id}', [TrainingDailyReportController::class, 'destroy']);

        // ユーザー選択
        Route::get('/users/selection', [UserController::class, 'selection']);
    });

    // 全員カレンダー
    Route::middleware('page:calendars')->group(function () {
        Route::get('/calendars/company', [CompanyCalendarController::class, 'index']);
        Route::get('/calendars/company/events/{eventId}', [CompanyCalendarController::class, 'showEvent']);
        Route::post('/calendars/company/refresh', [CompanyCalendarController::class, 'refresh']);
    });
});

// 管理者専用
Route::middleware(['auth:api', 'admin'])->group(function () {

    // ユーザー管理
    Route::get('/users', [UserController::class, 'index']);
    Route::post('/users', [UserController::class, 'store']);
    Route::put('/users/{id}', [UserController::class, 'update']);
    Route::delete('/users/{id}', [UserController::class, 'destroy']);

    // 認証履歴
    Route::get('/auth-logs', [AuthLogController::class, 'index']);
});
