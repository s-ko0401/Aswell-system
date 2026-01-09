<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TrainingMinorItem extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'training_middle_item_id',
        'name',
        'sort',
        'status',
    ];

    public function middleItem(): BelongsTo
    {
        return $this->belongsTo(TrainingMiddleItem::class, 'training_middle_item_id');
    }
}
