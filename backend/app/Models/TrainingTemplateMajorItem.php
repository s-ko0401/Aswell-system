<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TrainingTemplateMajorItem extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'training_template_id',
        'name',
        'sort',
    ];

    public function template(): BelongsTo
    {
        return $this->belongsTo(TrainingTemplate::class, 'training_template_id');
    }

    public function middleItems(): HasMany
    {
        return $this->hasMany(TrainingTemplateMiddleItem::class)->orderBy('sort');
    }
}
