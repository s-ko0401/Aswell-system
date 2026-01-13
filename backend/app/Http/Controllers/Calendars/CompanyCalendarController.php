<?php

namespace App\Http\Controllers\Calendars;

use App\Http\Controllers\Controller;
use App\Services\Calendars\CompanyCalendarService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CompanyCalendarController extends Controller
{
    public function __construct(private CompanyCalendarService $companyCalendarService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        return $this->companyCalendarService->index($request);
    }

    public function showEvent(Request $request, string $eventId): JsonResponse
    {
        return $this->companyCalendarService->showEvent($request, $eventId);
    }

    public function refresh(Request $request): JsonResponse
    {
        return $this->companyCalendarService->refresh($request);
    }

    public function refreshScheduler(Request $request): JsonResponse
    {
        $token = $request->header('X-CRON-TOKEN');
        $expected = config('services.calendar_refresh.token');

        if (!$expected || !is_string($token) || !hash_equals($expected, $token)) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'UNAUTHORIZED',
                    'message' => 'Unauthorized',
                    'details' => (object) [],
                ],
            ], 401);
        }

        return $this->companyCalendarService->refresh($request);
    }
}
