<?php

namespace App\Http\Requests\Users;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'username' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'loginid' => ['required', 'string', 'max:100', 'unique:users,loginid'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', 'integer', 'in:1,2'],
            'page_permissions' => ['nullable', 'array'],
            'page_permissions.*' => [
                'string',
                Rule::in(config('page_permissions.pages', [])),
            ],
        ];
    }
}
