<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TrainingDailyReportEntry extends Model
{
    protected $fillable = [
        'daily_report_id',
        'start_time',
        'end_time',
        'work_place',
        'instructor',
        'content',
        'achievement',
        'sort',
    ];

    public function dailyReport()
    {
        return $this->belongsTo(TrainingDailyReport::class, 'daily_report_id');
    }
}
