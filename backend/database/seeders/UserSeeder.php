<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        User::firstOrCreate(
            ['loginid' => 'admin'],
            [
                'username' => 'admin',
                'email' => 's-ko@as-well.co.jp',
                'password' => Hash::make('admin'),
                'role' => 1,
            ]
        );
    }
}
