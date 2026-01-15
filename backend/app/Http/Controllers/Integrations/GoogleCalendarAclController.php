<?php

namespace App\Http\Controllers\Integrations;

use App\Http\Controllers\Controller;
use App\Services\Integrations\GoogleCalendarAclService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GoogleCalendarAclController extends Controller
{
    public function __construct(private GoogleCalendarAclService $googleCalendarAclService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        return $this->googleCalendarAclService->index($request);
    }

    public function users(): JsonResponse
    {
        return $this->googleCalendarAclService->users();
    }

    public function update(Request $request): JsonResponse
    {
        return $this->googleCalendarAclService->update($request);
    }
}
