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
}
