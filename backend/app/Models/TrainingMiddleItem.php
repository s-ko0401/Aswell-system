<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TrainingMiddleItem extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'training_major_item_id',
        'name',
        'sort',
    ];

    public function majorItem(): BelongsTo
    {
        return $this->belongsTo(TrainingMajorItem::class, 'training_major_item_id');
    }

    public function minorItems(): HasMany
    {
        return $this->hasMany(TrainingMinorItem::class)->orderBy('sort');
    }
}
