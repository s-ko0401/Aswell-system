<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('calendar_acls', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('viewer_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('provider');
            $table->timestamps();

            $table->unique(['owner_user_id', 'viewer_user_id', 'provider']);
            $table->index(['viewer_user_id', 'provider']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('calendar_acls');
    }
};
