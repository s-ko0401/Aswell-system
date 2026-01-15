<?php

namespace App\Services\Calendars;

use App\Models\User;
use App\Models\CalendarAcl;
use App\Services\Calendars\GraphCalendarService;
use App\Services\Integrations\GoogleIntegrationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

class CompanyCalendarService
{
    private const CACHE_TTL_SECONDS = 3600;
    private const STALE_AFTER_SECONDS = 300;
    private const REFRESH_LOCK_TTL_SECONDS = 300;

    public function __construct(
        private GraphCalendarService $calendarService,
        private GoogleIntegrationService $googleIntegrationService
    )
    {
    }

    public function index(Request $request): JsonResponse
    {
        [$startAt, $endAt, $email] = $this->resolveRangeAndEmail($request);
        $cached = $this->getCachedPayload($startAt, $endAt, $email);
        $shouldRefresh = $this->shouldRefresh($cached['last_updated_at'] ?? null);
        $viewerId = $request->user()?->id;
        $users = $this->resolveUsers($email);

        if (app()->environment('local') &&
            empty($cached['calendars']) &&
            empty($cached['last_updated_at'])) {
            $payload = $this->refreshCache($startAt, $endAt, $email, true);
            $payload['calendars'] = $this->appendGoogleCalendars(
                $payload['calendars'] ?? [],
                $users,
                $startAt,
                $endAt,
                true,
                $viewerId
            );

            return response()->json([
                'success' => true,
                'data' => [
                    'range' => [
                        'start' => $startAt->toAtomString(),
                        'end' => $endAt->toAtomString(),
                    ],
                    'calendars' => $payload['calendars'] ?? [],
                    'errors' => $payload['errors'] ?? [],
                    'status' => $payload['status'] ?? 'refreshing',
                    'last_updated_at' => $payload['last_updated_at'] ?? null,
                ],
                'meta' => (object) [],
                'message' => '',
            ], $payload['status'] === 'fresh' ? 200 : 202);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'range' => [
                    'start' => $startAt->toAtomString(),
                    'end' => $endAt->toAtomString(),
                ],
                'calendars' => $this->appendGoogleCalendars(
                    $cached['calendars'] ?? [],
                    $users,
                    $startAt,
                    $endAt,
                    false,
                    $viewerId
                ),
                'errors' => $cached['errors'] ?? [],
                'status' => $shouldRefresh ? 'refreshing' : 'fresh',
                'last_updated_at' => $cached['last_updated_at'] ?? null,
            ],
            'meta' => (object) [],
            'message' => '',
        ]);
    }

    public function refresh(Request $request): JsonResponse
    {
        [$startAt, $endAt, $email] = $this->resolveRangeAndEmail($request);
        $payload = $this->refreshCache($startAt, $endAt, $email, true);
        $viewerId = $request->user()?->id;
        $users = $this->resolveUsers($email);
        $payload['calendars'] = $this->appendGoogleCalendars(
            $payload['calendars'] ?? [],
            $users,
            $startAt,
            $endAt,
            true,
            $viewerId
        );

        return response()->json([
            'success' => true,
            'data' => [
                'range' => [
                    'start' => $startAt->toAtomString(),
                    'end' => $endAt->toAtomString(),
                ],
                'calendars' => $payload['calendars'] ?? [],
                'errors' => $payload['errors'] ?? [],
                'status' => $payload['status'] ?? 'refreshing',
                'last_updated_at' => $payload['last_updated_at'] ?? null,
            ],
            'meta' => (object) [],
            'message' => '',
        ], $payload['status'] === 'fresh' ? 200 : 202);
    }

    public function showEvent(Request $request, string $eventId): JsonResponse
    {
        $email = $request->query('email');

        if (!$email) {
            return response()->json([
                'success' => false,
                'data' => [],
                'meta' => (object) [],
                'message' => 'email is required',
            ], 422);
        }

        $event = $this->calendarService->getEventDetailForUser($email, $eventId);

        return response()->json([
            'success' => true,
            'data' => $event,
            'meta' => (object) [],
            'message' => '',
        ]);
    }

    public function refreshCache(
        Carbon $startAt,
        Carbon $endAt,
        ?string $email,
        bool $forceRefresh = false
    ): array {
        $lockKey = $this->lockKey($startAt, $endAt, $email);
        if (!Cache::add($lockKey, now()->toIso8601String(), now()->addSeconds(self::REFRESH_LOCK_TTL_SECONDS))) {
            return array_merge(
                $this->getCachedPayload($startAt, $endAt, $email),
                ['status' => 'refreshing']
            );
        }

        $users = $this->resolveUsers($email);

        try {
            $result = $this->calendarService->getCalendarsForUsers(
                $users,
                $startAt,
                $endAt,
                $forceRefresh
            );

            $payload = [
                'calendars' => $result['calendars'] ?? [],
                'errors' => $result['errors'] ?? [],
            ];

            $cacheKey = $this->cacheKey($startAt, $endAt, $email);
            $metaKey = $this->metaKey($startAt, $endAt, $email);

            $existingPayload = Cache::get($cacheKey, []);
            $existingMeta = Cache::get($metaKey, []);
            $existingCalendars = $existingPayload['calendars'] ?? [];

            $hasNewCalendars = !empty($payload['calendars']);
            $hasExistingCalendars = !empty($existingCalendars);

            if (!$hasNewCalendars && $hasExistingCalendars) {
                $payload['calendars'] = $existingCalendars;
            }

            $lastUpdatedAt =
                (!$hasNewCalendars && $hasExistingCalendars)
                    ? ($existingMeta['last_updated_at'] ?? null)
                    : now()->toIso8601String();

            Cache::put(
                $cacheKey,
                $payload,
                now()->addSeconds(self::CACHE_TTL_SECONDS)
            );

            Cache::put(
                $metaKey,
                ['last_updated_at' => $lastUpdatedAt],
                now()->addSeconds(self::CACHE_TTL_SECONDS)
            );

            return [
                'calendars' => $payload['calendars'],
                'errors' => $payload['errors'],
                'last_updated_at' => $lastUpdatedAt,
                'status' => 'fresh',
            ];
        } finally {
            Cache::forget($lockKey);
        }
    }

    /**
     * @return array{0: Carbon, 1: Carbon, 2: ?string}
     */
    private function resolveRangeAndEmail(Request $request): array
    {
        $start = $request->input('start');
        $end = $request->input('end');
        $timezone = config('app.timezone', 'UTC');

        $startAt = $start
            ? Carbon::parse($start)->setTimezone($timezone)
            : now()->startOfWeek(Carbon::MONDAY);
        $endAt = $end
            ? Carbon::parse($end)->setTimezone($timezone)
            : now()->endOfWeek(Carbon::SUNDAY);

        return [$startAt, $endAt, $request->input('email')];
    }

    /**
     * @return array<int, array{id:mixed,email:?string,username:?string,role?:mixed}>
     */
    private function resolveUsers(?string $email): array
    {
        if ($email) {
            $user = User::query()->where('email', $email)->first(['id', 'email', 'username', 'role']);

            if ($user) {
                return [
                    [
                        'id' => $user->id,
                        'email' => $user->email,
                        'username' => $user->username,
                        'role' => (int) $user->role,
                    ],
                ];
            }

            return [
                [
                    'id' => $email,
                    'email' => $email,
                    'username' => $email,
                    'role' => null,
                ],
            ];
        }

        return User::query()
            ->whereNotNull('email')
            ->get(['id', 'email', 'username', 'role'])
            ->map(fn ($user) => [
                'id' => $user->id,
                'email' => $user->email,
                'username' => $user->username,
                'role' => (int) $user->role,
            ])
            ->all();
    }

    /**
     * @return array{calendars: array, errors: array, last_updated_at: ?string}
     */
    private function getCachedPayload(Carbon $startAt, Carbon $endAt, ?string $email): array
    {
        $payload = Cache::get($this->cacheKey($startAt, $endAt, $email), []);
        $meta = Cache::get($this->metaKey($startAt, $endAt, $email), []);

        return [
            'calendars' => $payload['calendars'] ?? [],
            'errors' => $payload['errors'] ?? [],
            'last_updated_at' => $meta['last_updated_at'] ?? null,
        ];
    }

    private function shouldRefresh(?string $lastUpdatedAt): bool
    {
        if (!$lastUpdatedAt) {
            return true;
        }

        $lastUpdated = Carbon::parse($lastUpdatedAt);
        return $lastUpdated->diffInSeconds(now()) >= self::STALE_AFTER_SECONDS;
    }

    private function cacheKey(Carbon $startAt, Carbon $endAt, ?string $email): string
    {
        return sprintf(
            'company.calendar.%s.%s.%s',
            $email ? strtolower($email) : 'all',
            $startAt->toAtomString(),
            $endAt->toAtomString()
        );
    }

    private function metaKey(Carbon $startAt, Carbon $endAt, ?string $email): string
    {
        return $this->cacheKey($startAt, $endAt, $email) . '.meta';
    }

    private function lockKey(Carbon $startAt, Carbon $endAt, ?string $email): string
    {
        return $this->cacheKey($startAt, $endAt, $email) . '.refreshing';
    }

    /**
     * @param array<int, array{user: array{id:mixed,email:?string,username:?string,role?:mixed}, events: array<int, array<string, mixed>>}> $calendars
     * @param array<int, array{id:mixed,email:?string,username:?string,role?:mixed}> $users
     * @return array<int, array{user: array{id:mixed,email:?string,username:?string,role?:mixed}, events: array<int, array<string, mixed>>}>
     */
    private function appendGoogleCalendars(
        array $calendars,
        array $users,
        Carbon $startAt,
        Carbon $endAt,
        bool $forceRefresh,
        ?int $viewerId
    ): array {
        if (!$viewerId) {
            return $calendars;
        }

        $allowedOwnerIds = $this->allowedGoogleOwnerIds($viewerId);
        if (empty($allowedOwnerIds)) {
            return $calendars;
        }

        $allowedSet = array_flip($allowedOwnerIds);
        $calendarIndex = [];

        foreach ($calendars as $index => $calendar) {
            $userId = $calendar['user']['id'] ?? (string) $index;
            $calendarIndex[(string) $userId] = $index;
        }

        foreach ($users as $user) {
            $rawId = $user['id'] ?? null;
            if (!is_numeric($rawId)) {
                continue;
            }

            $userId = (int) $rawId;
            if (!isset($allowedSet[$userId])) {
                continue;
            }

            $googleEvents = $this->googleIntegrationService->eventsForUserId(
                $userId,
                $startAt,
                $endAt,
                $forceRefresh
            );

            if (empty($googleEvents)) {
                continue;
            }

            $normalizedEvents = $this->normalizeGoogleEvents($googleEvents);
            $index = $calendarIndex[(string) $userId] ?? null;

            if ($index === null) {
                $calendars[] = [
                    'user' => [
                        'id' => $userId,
                        'email' => $user['email'] ?? null,
                        'username' => $user['username'] ?? null,
                        'role' => $user['role'] ?? null,
                    ],
                    'events' => $normalizedEvents,
                ];
                $calendarIndex[(string) $userId] = array_key_last($calendars);
                continue;
            }

            $existingEvents = $calendars[$index]['events'] ?? [];
            $calendars[$index]['events'] = $this->mergeEvents(
                $existingEvents,
                $normalizedEvents
            );
        }

        return $calendars;
    }

    /**
     * @param array<int, array{id:string,summary:string,start:string,end:string,all_day:bool}> $events
     * @return array<int, array<string, mixed>>
     */
    private function normalizeGoogleEvents(array $events): array
    {
        $timezone = config('app.timezone', 'UTC');

        return array_values(array_filter(array_map(function (array $event) use ($timezone) {
            $start = $event['start'] ?? null;
            $end = $event['end'] ?? null;

            if (!is_string($start) || !is_string($end)) {
                return null;
            }

            return [
                'id' => 'google:' . ($event['id'] ?? ''),
                'subject' => $event['summary'] ?? '',
                'start' => [
                    'dateTime' => $start,
                    'timeZone' => $timezone,
                ],
                'end' => [
                    'dateTime' => $end,
                    'timeZone' => $timezone,
                ],
                'source' => 'google',
                'isAllDay' => (bool) ($event['all_day'] ?? false),
            ];
        }, $events)));
    }

    /**
     * @param array<int, array<string, mixed>> $baseEvents
     * @param array<int, array<string, mixed>> $additionalEvents
     * @return array<int, array<string, mixed>>
     */
    private function mergeEvents(array $baseEvents, array $additionalEvents): array
    {
        $events = array_merge($baseEvents, $additionalEvents);

        usort($events, function ($a, $b) {
            $startA = $a['start']['dateTime'] ?? null;
            $startB = $b['start']['dateTime'] ?? null;

            return strtotime((string) $startA) <=> strtotime((string) $startB);
        });

        return $events;
    }

    /**
     * @return array<int, int>
     */
    private function allowedGoogleOwnerIds(int $viewerId): array
    {
        $ownerIds = CalendarAcl::query()
            ->where('provider', 'google')
            ->where('viewer_user_id', $viewerId)
            ->pluck('owner_user_id')
            ->all();

        $ownerIds[] = $viewerId;

        return array_values(array_unique(array_map('intval', $ownerIds)));
    }
}
