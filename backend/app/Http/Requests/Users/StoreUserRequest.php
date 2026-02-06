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
            'staff_number' => ['required', 'string', 'max:100', 'unique:users,staff_number'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', 'integer', 'in:1,2'],
            'page_permissions' => ['nullable', 'array'],
            'page_permissions.*' => [
                'string',
                Rule::in(config('page_permissions.pages', [])),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique'          => 'そのメールアドレスは既に使用されています。',
            'loginid.unique'        => 'そのログインIDは既に使用されています。',
            'staff_number.unique'   => 'その社員番号は既に使用されています。',
        ];
    }
}
