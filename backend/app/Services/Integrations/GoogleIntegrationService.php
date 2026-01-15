<?php

namespace App\Services\Integrations;

use App\Models\ExternalAccount;
use App\Models\OauthState;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Contracts\Encryption\DecryptException;
use RuntimeException;

class GoogleIntegrationService
{
    private const PROVIDER = 'google';
    private const STATE_TTL_MINUTES = 10;
    private const EVENTS_CACHE_TTL_SECONDS = 300;
    private const SCOPES = [
        'https://www.googleapis.com/auth/calendar.readonly',
        'openid',
        'email',
    ];

    public function authorize(Request $request): JsonResponse
    {
        $user = $request->user();
        $requestId = $this->requestId($request);

        $state = Str::random(64);

        OauthState::create([
            'user_id' => $user->id,
            'provider' => self::PROVIDER,
            'state' => $state,
            'expires_at' => now()->addMinutes(self::STATE_TTL_MINUTES),
        ]);

        Log::info('google_integration.authorize', [
            'user_id' => $user->id,
            'request_id' => $requestId,
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'auth_url' => $this->buildAuthUrl($state),
                'state' => $state,
            ],
            'message' => '',
        ]);
    }

    public function callback(Request $request): RedirectResponse
    {
        $frontUrl = rtrim((string) config('services.google.frontend_url'), '/');
        if ($frontUrl === '') {
            $frontUrl = rtrim((string) config('app.url'), '/');
        }

        $errorRedirect = $frontUrl . '/profile?google=error';
        $successRedirect = $frontUrl . '/profile?google=connected';

        $state = $request->query('state');
        $code = $request->query('code');
        $error = $request->query('error');

        if ($error || !$state || !$code) {
            return redirect()->away($errorRedirect);
        }

        $stateRecord = OauthState::query()
            ->where('provider', self::PROVIDER)
            ->where('state', $state)
            ->where('expires_at', '>', now())
            ->first();

        if (!$stateRecord) {
            return redirect()->away($errorRedirect);
        }

        $userId = $stateRecord->user_id;
        $stateRecord->delete();

        try {
            $tokenPayload = $this->exchangeCodeForToken($code);
        } catch (RequestException $exception) {
            Log::warning('google_integration.token_exchange_failed', [
                'user_id' => $userId,
                'request_id' => $this->requestId($request),
                'message' => $exception->getMessage(),
            ]);

            return redirect()->away($errorRedirect);
        }

        $accessToken = $tokenPayload['access_token'] ?? null;
        if (!is_string($accessToken) || $accessToken === '') {
            return redirect()->away($errorRedirect);
        }

        $refreshToken = $tokenPayload['refresh_token'] ?? null;

        try {
            $providerEmail = $this->fetchGoogleEmail($accessToken);
        } catch (RequestException $exception) {
            Log::warning('google_integration.userinfo_failed', [
                'user_id' => $userId,
                'request_id' => $this->requestId($request),
                'message' => $exception->getMessage(),
            ]);

            return redirect()->away($errorRedirect);
        }

        if ($providerEmail === '') {
            Log::warning('google_integration.userinfo_missing_email', [
                'user_id' => $userId,
                'request_id' => $this->requestId($request),
            ]);

            return redirect()->away($errorRedirect);
        }

        $account = ExternalAccount::firstOrNew([
            'user_id' => $userId,
            'provider' => self::PROVIDER,
        ]);

        if (is_string($refreshToken) && $refreshToken !== '') {
            $account->refresh_token_encrypted = Crypt::encryptString($refreshToken);
        } elseif (!$account->refresh_token_encrypted) {
            Log::warning('google_integration.missing_refresh_token', [
                'user_id' => $userId,
                'request_id' => $this->requestId($request),
            ]);

            return redirect()->away($errorRedirect);
        }

        $account->provider_email = $providerEmail;
        $account->scopes = $this->normalizeScopes($tokenPayload['scope'] ?? null);
        $account->connected_at = now();
        $account->revoked_at = null;
        $account->save();

        Log::info('google_integration.connected', [
            'user_id' => $userId,
            'request_id' => $this->requestId($request),
        ]);

        return redirect()->away($successRedirect);
    }

    public function events(Request $request): JsonResponse
    {
        $user = $request->user();
        $requestId = $this->requestId($request);

        $from = $request->query('from');
        $to = $request->query('to');

        if (!$from || !$to) {
            return $this->errorResponse('VALIDATION_ERROR', 'from and to are required.', 422);
        }

        try {
            $fromAt = Carbon::parse($from);
            $toAt = Carbon::parse($to);
        } catch (\Throwable $exception) {
            return $this->errorResponse('VALIDATION_ERROR', 'Invalid date format.', 422);
        }

        $account = $this->resolveAccountForUserId($user->id);

        if (!$account || !$account->refresh_token_encrypted) {
            return $this->errorResponse('NOT_CONNECTED', 'Google account is not connected.', 404);
        }

        try {
            $items = $this->fetchEventsForAccount($account, $fromAt, $toAt, $user->id, $requestId);
        } catch (DecryptException $exception) {
            Log::warning('google_integration.decrypt_failed', [
                'user_id' => $user->id,
                'request_id' => $requestId,
            ]);

            return $this->errorResponse('TOKEN_ERROR', 'Token decryption failed.', 500);
        } catch (RequestException|RuntimeException $exception) {
            Log::warning('google_integration.events_failed', [
                'user_id' => $user->id,
                'request_id' => $requestId,
                'message' => $exception->getMessage(),
            ]);

            return $this->errorResponse('GOOGLE_API_ERROR', 'Failed to fetch Google Calendar events.', 502);
        }

        Log::info('google_integration.events_fetched', [
            'user_id' => $user->id,
            'request_id' => $requestId,
            'count' => count($items),
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'items' => $items,
            ],
            'message' => '',
        ]);
    }

    public function disconnect(Request $request): JsonResponse
    {
        $user = $request->user();
        $requestId = $this->requestId($request);

        $account = ExternalAccount::query()
            ->where('user_id', $user->id)
            ->where('provider', self::PROVIDER)
            ->whereNull('revoked_at')
            ->first();

        if ($account) {
            $account->revoked_at = now();
            $account->refresh_token_encrypted = null;
            $account->save();
        }

        Log::info('google_integration.disconnected', [
            'user_id' => $user->id,
            'request_id' => $requestId,
        ]);

        return response()->json([
            'success' => true,
            'data' => (object) [],
            'message' => '',
        ]);
    }

    /**
     * @return array<int, array{id:string,summary:string,start:string,end:string,all_day:bool}>
     */
    public function eventsForUserId(
        int $userId,
        Carbon $from,
        Carbon $to,
        bool $forceRefresh = false
    ): array {
        $account = $this->resolveAccountForUserId($userId);

        if (!$account || !$account->refresh_token_encrypted) {
            return [];
        }

        $cacheKey = $this->eventsCacheKey($userId, $from, $to);
        if (!$forceRefresh && Cache::has($cacheKey)) {
            return Cache::get($cacheKey, []);
        }

        $requestId = (string) Str::uuid();

        try {
            $items = $this->fetchEventsForAccount($account, $from, $to, $userId, $requestId);
        } catch (DecryptException|RequestException|RuntimeException $exception) {
            Log::warning('google_integration.events_failed', [
                'user_id' => $userId,
                'request_id' => $requestId,
                'message' => $exception->getMessage(),
            ]);

            return [];
        }

        Cache::put($cacheKey, $items, now()->addSeconds(self::EVENTS_CACHE_TTL_SECONDS));

        return $items;
    }

    private function buildAuthUrl(string $state): string
    {
        $clientId = config('services.google.client_id');
        $redirectUri = config('services.google.redirect');

        $query = http_build_query([
            'client_id' => $clientId,
            'redirect_uri' => $redirectUri,
            'response_type' => 'code',
            'scope' => implode(' ', self::SCOPES),
            'access_type' => 'offline',
            'prompt' => 'consent',
            'include_granted_scopes' => 'true',
            'state' => $state,
        ], '', '&', PHP_QUERY_RFC3986);

        return 'https://accounts.google.com/o/oauth2/v2/auth?' . $query;
    }

    /**
     * @return array<string, mixed>
     */
    private function exchangeCodeForToken(string $code): array
    {
        $response = Http::asForm()
            ->retry(2, 200)
            ->post('https://oauth2.googleapis.com/token', [
                'client_id' => config('services.google.client_id'),
                'client_secret' => config('services.google.client_secret'),
                'redirect_uri' => config('services.google.redirect'),
                'grant_type' => 'authorization_code',
                'code' => $code,
            ])
            ->throw();

        return $response->json() ?? [];
    }

    private function fetchGoogleEmail(string $accessToken): string
    {
        $response = Http::withToken($accessToken)
            ->retry(2, 200)
            ->get('https://openidconnect.googleapis.com/v1/userinfo')
            ->throw();

        $email = $response->json('email');

        return is_string($email) ? $email : '';
    }

    private function refreshAccessToken(string $refreshToken): string
    {
        $response = Http::asForm()
            ->retry(2, 200)
            ->post('https://oauth2.googleapis.com/token', [
                'client_id' => config('services.google.client_id'),
                'client_secret' => config('services.google.client_secret'),
                'refresh_token' => $refreshToken,
                'grant_type' => 'refresh_token',
            ])
            ->throw();

        $accessToken = $response->json('access_token');

        return is_string($accessToken) ? $accessToken : '';
    }

    /**
     * @return array<int, array{id:string,summary:string,start:string,end:string,all_day:bool}>
     */
    private function fetchEvents(string $accessToken, Carbon $from, Carbon $to): array
    {
        $timezone = config('app.timezone', 'UTC');

        $response = Http::withToken($accessToken)
            ->retry(2, 200)
            ->get('https://www.googleapis.com/calendar/v3/calendars/primary/events', [
                'timeMin' => $from->toIso8601String(),
                'timeMax' => $to->toIso8601String(),
                'singleEvents' => 'true',
                'orderBy' => 'startTime',
                'timeZone' => $timezone,
                'maxResults' => 250,
            ])
            ->throw();

        $items = $response->json('items') ?? [];

        return collect($items)
            ->map(function ($event) use ($timezone) {
                $startValue = $event['start']['dateTime'] ?? $event['start']['date'] ?? null;
                $endValue = $event['end']['dateTime'] ?? $event['end']['date'] ?? null;

                if (!$startValue || !$endValue) {
                    return null;
                }

                $isAllDay = isset($event['start']['date']) || isset($event['end']['date']);

                if ($isAllDay) {
                    $startAt = Carbon::parse($startValue, $timezone)->startOfDay();
                    $endAt = Carbon::parse($endValue, $timezone)->startOfDay();
                } else {
                    $startAt = Carbon::parse($startValue)->setTimezone($timezone);
                    $endAt = Carbon::parse($endValue)->setTimezone($timezone);
                }

                return [
                    'id' => (string) ($event['id'] ?? ''),
                    'summary' => (string) ($event['summary'] ?? ''),
                    'start' => $startAt->toIso8601String(),
                    'end' => $endAt->toIso8601String(),
                    'all_day' => $isAllDay,
                ];
            })
            ->filter()
            ->values()
            ->all();
    }

    /**
     * @return array<int, string>
     */
    private function normalizeScopes(mixed $scopeValue): array
    {
        if (!is_string($scopeValue) || $scopeValue === '') {
            return self::SCOPES;
        }

        return array_values(array_filter(explode(' ', $scopeValue)));
    }

    private function resolveAccountForUserId(int $userId): ?ExternalAccount
    {
        return ExternalAccount::query()
            ->where('user_id', $userId)
            ->where('provider', self::PROVIDER)
            ->whereNull('revoked_at')
            ->first();
    }

    /**
     * @return array<int, array{id:string,summary:string,start:string,end:string,all_day:bool}>
     *
     * @throws DecryptException
     * @throws RequestException
     */
    private function fetchEventsForAccount(
        ExternalAccount $account,
        Carbon $from,
        Carbon $to,
        int $userId,
        string $requestId
    ): array {
        $refreshToken = Crypt::decryptString($account->refresh_token_encrypted);
        $accessToken = $this->refreshAccessToken($refreshToken);

        if ($accessToken === '') {
            Log::warning('google_integration.missing_access_token', [
                'user_id' => $userId,
                'request_id' => $requestId,
            ]);

            throw new RuntimeException('Token refresh failed.');
        }

        return $this->fetchEvents($accessToken, $from, $to);
    }

    private function requestId(Request $request): string
    {
        $requestId = $request->header('X-Request-Id') ?? $request->header('X-Request-ID');

        return is_string($requestId) && $requestId !== '' ? $requestId : (string) Str::uuid();
    }

    private function eventsCacheKey(int $userId, Carbon $from, Carbon $to): string
    {
        return sprintf(
            'google.calendar.%s.%s.%s',
            $userId,
            $from->toAtomString(),
            $to->toAtomString()
        );
    }

    private function errorResponse(string $code, string $message, int $status): JsonResponse
    {
        return response()->json([
            'success' => false,
            'error' => [
                'code' => $code,
                'message' => $message,
                'details' => (object) [],
            ],
        ], $status);
    }
}
