<?php

namespace App\Jobs\Calendars;

use App\Services\Calendars\CompanyCalendarService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;

class RefreshCompanyCalendarsJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public function __construct(
        private string $startAt,
        private string $endAt,
        private ?string $email,
        private bool $forceRefresh = false
    ) {
    }

    public function handle(CompanyCalendarService $companyCalendarService): void
    {
        $companyCalendarService->refreshCache(
            Carbon::parse($this->startAt),
            Carbon::parse($this->endAt),
            $this->email,
            $this->forceRefresh
        );
    }
}
