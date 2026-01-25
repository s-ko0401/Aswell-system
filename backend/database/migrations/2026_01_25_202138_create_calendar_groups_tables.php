<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('calendar_groups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 100);
            $table->timestamps();

            $table->unique(['user_id', 'name']);
        });

        Schema::create('calendar_group_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('group_id')->constrained('calendar_groups')->cascadeOnDelete();
            $table->foreignId('member_user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['group_id', 'member_user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('calendar_group_members');
        Schema::dropIfExists('calendar_groups');
    }
};
