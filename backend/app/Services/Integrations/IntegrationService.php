<?php

namespace App\Services\Integrations;

use App\Models\ExternalAccount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IntegrationService
{
    private const GOOGLE_PROVIDER = 'google';

    public function status(Request $request): JsonResponse
    {
        $user = $request->user();

        $googleAccount = ExternalAccount::query()
            ->where('user_id', $user->id)
            ->where('provider', self::GOOGLE_PROVIDER)
            ->whereNull('revoked_at')
            ->first();

        return response()->json([
            'success' => true,
            'data' => [
                'google' => [
                    'connected' => (bool) $googleAccount,
                    'email' => $googleAccount?->provider_email,
                    'connected_at' => $googleAccount?->connected_at?->toIso8601String(),
                ],
            ],
            'message' => '',
        ]);
    }
}
