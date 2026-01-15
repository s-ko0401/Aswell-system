<?php

namespace App\Http\Controllers\Integrations;

use App\Http\Controllers\Controller;
use App\Services\Integrations\GoogleIntegrationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class GoogleIntegrationController extends Controller
{
    public function __construct(private GoogleIntegrationService $googleIntegrationService)
    {
    }

    public function authorize(Request $request): JsonResponse
    {
        return $this->googleIntegrationService->authorize($request);
    }

    public function callback(Request $request): RedirectResponse
    {
        return $this->googleIntegrationService->callback($request);
    }

    public function events(Request $request): JsonResponse
    {
        return $this->googleIntegrationService->events($request);
    }

    public function disconnect(Request $request): JsonResponse
    {
        return $this->googleIntegrationService->disconnect($request);
    }
}
