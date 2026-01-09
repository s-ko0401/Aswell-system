<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTrainingTemplateRequest extends FormRequest
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
            'major_items.*.name' => 'required|string|max:255',
            'major_items.*.sort' => 'required|integer',
            'major_items.*.middle_items' => 'nullable|array',
            'major_items.*.middle_items.*.name' => 'required|string|max:255',
            'major_items.*.middle_items.*.sort' => 'required|integer',
            'major_items.*.middle_items.*.minor_items' => 'nullable|array',
            'major_items.*.middle_items.*.minor_items.*.name' => 'required|string|max:255',
            'major_items.*.middle_items.*.minor_items.*.sort' => 'required|integer',
        ];
    }
}
