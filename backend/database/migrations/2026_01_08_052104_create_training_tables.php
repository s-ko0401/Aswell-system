<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Trainings (Main)
        Schema::create('trainings', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->unsignedBigInteger('training_template_id')->nullable(); // Reference only, no FK
            $table->foreignId('manager_id')->constrained('users');
            $table->foreignId('teacher_id')->constrained('users');
            $table->foreignId('trainee_id')->constrained('users');
            $table->date('start_date')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
        });

        // 2. Training Major Items
        Schema::create('training_major_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('training_id')->constrained('trainings')->onDelete('cascade');
            $table->string('name');
            $table->integer('sort');
            $table->index(['training_id', 'sort']);
        });

        // 3. Training Middle Items
        Schema::create('training_middle_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('training_major_item_id')->constrained('training_major_items')->onDelete('cascade');
            $table->string('name');
            $table->integer('sort');
            $table->index(['training_major_item_id', 'sort'], 'tm_major_sort_idx');
        });

        // 4. Training Minor Items
        Schema::create('training_minor_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('training_middle_item_id')->constrained('training_middle_items')->onDelete('cascade');
            $table->string('name');
            $table->integer('sort');
            $table->enum('status', ['未着手', '研修中', '完了'])->default('未着手');
            $table->index(['training_middle_item_id', 'sort'], 'tm_middle_sort_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('training_minor_items');
        Schema::dropIfExists('training_middle_items');
        Schema::dropIfExists('training_major_items');
        Schema::dropIfExists('trainings');
    }
};
