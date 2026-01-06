<?php

namespace App\Http\Requests\Users;

use Illuminate\Foundation\Http\FormRequest;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $userId = $this->route('id');

        return [
            'username' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:255', "unique:users,email,{$userId}"],
            'loginid' => ['required', 'string', 'max:100', "unique:users,loginid,{$userId}"],
            'password' => ['nullable', 'string', 'min:8'],
            'role' => ['required', 'integer', 'in:1,2'],
        ];
    }
}
