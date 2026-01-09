<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TrainingTemplateMinorItem extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'training_template_middle_item_id',
        'name',
        'sort',
    ];

    public function middleItem(): BelongsTo
    {
        return $this->belongsTo(TrainingTemplateMiddleItem::class, 'training_template_middle_item_id');
    }
}
