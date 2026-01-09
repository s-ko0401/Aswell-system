<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTrainingTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'major_items' => 'nullable|array',
            'major_items.*.id' => 'nullable|integer|exists:training_template_major_items,id',
            'major_items.*.name' => 'required|string|max:255',
            'major_items.*.sort' => 'required|integer',
            'major_items.*.middle_items' => 'nullable|array',
            'major_items.*.middle_items.*.id' => 'nullable|integer|exists:training_template_middle_items,id',
            'major_items.*.middle_items.*.name' => 'required|string|max:255',
            'major_items.*.middle_items.*.sort' => 'required|integer',
            'major_items.*.middle_items.*.minor_items' => 'nullable|array',
            'major_items.*.middle_items.*.minor_items.*.id' => 'nullable|integer|exists:training_template_minor_items,id',
            'major_items.*.middle_items.*.minor_items.*.name' => 'required|string|max:255',
            'major_items.*.middle_items.*.minor_items.*.sort' => 'required|integer',
        ];
    }
}
