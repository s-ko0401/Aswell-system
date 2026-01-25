<?php

namespace App\Http\Controllers\Calendars;

use App\Http\Controllers\Controller;
use App\Services\Calendars\CalendarGroupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CalendarGroupController extends Controller
{
    public function __construct(private CalendarGroupService $calendarGroupService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        return $this->calendarGroupService->index($request);
    }

    public function store(Request $request): JsonResponse
    {
        return $this->calendarGroupService->store($request);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        return $this->calendarGroupService->update($request, $id);
    }

    public function updateMembers(Request $request, int $id): JsonResponse
    {
        return $this->calendarGroupService->updateMembers($request, $id);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        return $this->calendarGroupService->destroy($request, $id);
    }
}
