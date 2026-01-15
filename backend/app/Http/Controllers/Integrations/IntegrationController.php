<?php

namespace App\Http\Controllers\Integrations;

use App\Http\Controllers\Controller;
use App\Services\Integrations\IntegrationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IntegrationController extends Controller
{
    public function __construct(private IntegrationService $integrationService)
    {
    }

    public function status(Request $request): JsonResponse
    {
        return $this->integrationService->status($request);
    }
}
