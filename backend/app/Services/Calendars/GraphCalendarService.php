<?php

namespace App\Services\Calendars;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Client\Response;

class GraphCalendarService
{
    private const CALENDAR_CACHE_TTL_SECONDS = 300;
    private const CALENDAR_SELECT_FIELDS = 'id,subject,start,end,location';
    private const EVENT_DETAIL_CACHE_TTL_SECONDS = 300;
    private const EVENT_DETAIL_SELECT_FIELDS = 'id,subject,start,end,location,organizer,attendees,bodyPreview,body,isAllDay,onlineMeetingUrl,webLink';
    private const POOL_CHUNK_SIZE = 8;

    public function getCalendarForUser(
        string $userIdOrEmail,
        Carbon $start,
        Carbon $end,
        bool $forceRefresh = false
    ): array
    {
        $cacheKey = $this->calendarCacheKey($userIdOrEmail, $start, $end);

        if ($forceRefresh) {
            $events = $this->fetchCalendarForUser($userIdOrEmail, $start, $end);
            Cache::put($cacheKey, $events, now()->addSeconds(self::CALENDAR_CACHE_TTL_SECONDS));
            return $events;
        }

        return Cache::remember(
            $cacheKey,
            now()->addSeconds(self::CALENDAR_CACHE_TTL_SECONDS),
            fn () => $this->fetchCalendarForUser($userIdOrEmail, $start, $end)
        );
    }

    /**
     * @param array<int, array{id:mixed,email:?string,username:?string,role?:mixed}> $users
     */
    public function getCalendarsForUsers(
        array $users,
        Carbon $start,
        Carbon $end,
        bool $forceRefresh = false
    ): array
    {
        $calendars = [];
        $errors = [];
        $pending = [];

        foreach ($users as $user) {
            $userEmail = $user['email'] ?? null;
            $userName = $user['username'] ?? null;
            $userId = $user['id'] ?? $userEmail;
            $userRole = $user['role'] ?? null;

            if (!$userEmail) {
                $errors[] = [
                    'email' => null,
                    'message' => 'User email is missing.',
                ];
                continue;
            }

            $userPayload = [
                'id' => $userId,
                'email' => $userEmail,
                'username' => $userName,
                'role' => $userRole === null ? null : (int) $userRole,
            ];

            $cacheKey = $this->calendarCacheKey($userEmail, $start, $end);
            if (!$forceRefresh && Cache::has($cacheKey)) {
                $calendars[] = [
                    'user' => $userPayload,
                    'events' => Cache::get($cacheKey, []),
                ];
                continue;
            }

            $pending[] = [
                'email' => $userEmail,
                'user' => $userPayload,
                'cache_key' => $cacheKey,
            ];
        }

        if (empty($pending)) {
            return [
                'calendars' => $calendars,
                'errors' => $errors,
            ];
        }

        $token = $this->getAppToken();
        $timezone = config('app.timezone', 'UTC');

        foreach (array_chunk($pending, self::POOL_CHUNK_SIZE) as $chunk) {
            $responses = Http::pool(function ($pool) use ($chunk, $token, $timezone, $start, $end) {
                foreach ($chunk as $item) {
                    $encodedUser = rawurlencode($item['email']);
                    $pool->as($item['email'])
                        ->withToken($token)
                        ->retry(2, 200)
                        ->withHeaders([
                            'Prefer' => 'outlook.timezone="' . $timezone . '"',
                        ])
                        ->get("https://graph.microsoft.com/v1.0/users/{$encodedUser}/calendarView", $this->calendarQueryParams($start, $end));
                }
            });

            foreach ($chunk as $item) {
                $response = $responses[$item['email']] ?? null;

                if ($response instanceof RequestException) {
                    $payload = $response->response?->json();
                    $message = $payload['error']['message'] ?? $response->getMessage();
                    $errors[] = [
                        'email' => $item['email'],
                        'message' => 'Graph request failed: ' . $message,
                    ];
                    continue;
                }

                if (!$response) {
                    $errors[] = [
                        'email' => $item['email'],
                        'message' => 'Graph request failed: no response.',
                    ];
                    continue;
                }

                if (!($response instanceof Response)) {
                    $errors[] = [
                        'email' => $item['email'],
                        'message' => 'Graph request failed: invalid response.',
                    ];
                    continue;
                }

                if ($response->failed()) {
                    $payload = $response->json();
                    $message = $payload['error']['message'] ?? $response->body();
                    $errors[] = [
                        'email' => $item['email'],
                        'message' => 'Graph request failed: ' . $message,
                    ];
                    continue;
                }

                $events = $response->json('value') ?? [];
                Cache::put($item['cache_key'], $events, now()->addSeconds(self::CALENDAR_CACHE_TTL_SECONDS));

                $calendars[] = [
                    'user' => $item['user'],
                    'events' => $events,
                ];
            }
        }

        return [
            'calendars' => $calendars,
            'errors' => $errors,
        ];
    }

    public function getEventDetailForUser(string $userIdOrEmail, string $eventId): array
    {
        $cacheKey = $this->eventDetailCacheKey($userIdOrEmail, $eventId);

        return Cache::remember($cacheKey, now()->addSeconds(self::EVENT_DETAIL_CACHE_TTL_SECONDS), function () use ($userIdOrEmail, $eventId) {
            $token = $this->getAppToken();
            $timezone = config('app.timezone', 'UTC');
            $encodedUser = rawurlencode($userIdOrEmail);
            $encodedEvent = rawurlencode($eventId);

            $response = Http::withToken($token)
                ->withHeaders([
                    'Prefer' => 'outlook.timezone="' . $timezone . '"',
                ])
                ->get("https://graph.microsoft.com/v1.0/users/{$encodedUser}/events/{$encodedEvent}", $this->eventDetailQueryParams())
                ->throw();

            return $response->json() ?? [];
        });
    }

    private function fetchCalendarForUser(string $userIdOrEmail, Carbon $start, Carbon $end): array
    {
        $token = $this->getAppToken();
        $timezone = config('app.timezone', 'UTC');
        $encodedUser = rawurlencode($userIdOrEmail);

        $response = Http::withToken($token)
            ->withHeaders([
                'Prefer' => 'outlook.timezone="' . $timezone . '"',
            ])
            ->get(
                "https://graph.microsoft.com/v1.0/users/{$encodedUser}/calendarView",
                $this->calendarQueryParams($start, $end)
            )
            ->throw();

        return $response->json('value') ?? [];
    }

    private function calendarCacheKey(string $userIdOrEmail, Carbon $start, Carbon $end): string
    {
        return sprintf(
            'graph.calendar.%s.%s.%s',
            strtolower($userIdOrEmail),
            $start->toAtomString(),
            $end->toAtomString()
        );
    }

    private function eventDetailCacheKey(string $userIdOrEmail, string $eventId): string
    {
        return sprintf(
            'graph.event.%s.%s',
            strtolower($userIdOrEmail),
            $eventId
        );
    }

    private function calendarQueryParams(Carbon $start, Carbon $end): array
    {
        return [
            'startDateTime' => $start->toAtomString(),
            'endDateTime' => $end->toAtomString(),
            '$select' => self::CALENDAR_SELECT_FIELDS,
            '$top' => 100,
        ];
    }

    private function eventDetailQueryParams(): array
    {
        return [
            '$select' => self::EVENT_DETAIL_SELECT_FIELDS,
        ];
    }

    private function getAppToken(): string
    {
        $config = config('services.microsoft');
        $clientId = $config['client_id'] ?? null;
        $clientSecret = $config['client_secret'] ?? null;
        $tenant = $config['tenant'] ?? null;

        if (!$clientId || !$clientSecret || !$tenant) {
            throw new \RuntimeException('Microsoft Graph credentials are missing.');
        }

        $cacheKey = sprintf('graph.token.%s', $tenant);

        return Cache::remember($cacheKey, now()->addMinutes(55), function () use ($tenant, $clientId, $clientSecret, $cacheKey) {
            $response = Http::asForm()
                ->post("https://login.microsoftonline.com/{$tenant}/oauth2/v2.0/token", [
                    'client_id' => $clientId,
                    'client_secret' => $clientSecret,
                    'scope' => 'https://graph.microsoft.com/.default',
                    'grant_type' => 'client_credentials',
                ])
                ->throw();

            $token = $response->json('access_token');
            $expiresIn = (int) $response->json('expires_in', 3600);

            if (!$token) {
                throw new \RuntimeException('Microsoft Graph token response missing access_token.');
            }

            Cache::put($cacheKey, $token, now()->addSeconds(max(60, $expiresIn - 60)));

            return $token;
        });
    }
}
