<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TrainingTemplateMiddleItem extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'training_template_major_item_id',
        'name',
        'sort',
    ];

    public function majorItem(): BelongsTo
    {
        return $this->belongsTo(TrainingTemplateMajorItem::class, 'training_template_major_item_id');
    }

    public function minorItems(): HasMany
    {
        return $this->hasMany(TrainingTemplateMinorItem::class)->orderBy('sort');
    }
}
