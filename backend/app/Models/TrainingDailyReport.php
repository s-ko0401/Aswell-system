<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TrainingDailyReport extends Model
{
    protected $fillable = [
        'training_id',
        'report_date',
        'notes',
        'created_by',
    ];

    public function training()
    {
        return $this->belongsTo(Training::class);
    }

    public function entries()
    {
        return $this->hasMany(TrainingDailyReportEntry::class, 'daily_report_id')->orderBy('sort');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
