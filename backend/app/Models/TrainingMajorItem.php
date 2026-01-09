<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TrainingMajorItem extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'training_id',
        'name',
        'sort',
    ];

    public function training(): BelongsTo
    {
        return $this->belongsTo(Training::class);
    }

    public function middleItems(): HasMany
    {
        return $this->hasMany(TrainingMiddleItem::class)->orderBy('sort');
    }
}
