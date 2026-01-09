<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Training Templates (Root)
        Schema::create('training_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps(); // created_at, updated_at
        });

        // 2. Major Items (Level 1)
        Schema::create('training_template_major_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('training_template_id')
                  ->constrained('training_templates')
                  ->onDelete('cascade');
            $table->string('name');
            $table->integer('sort');
            
            // Indexes & Unique constraints
            $table->index('training_template_id');
            $table->unique(['training_template_id', 'sort']);
        });

        // 3. Middle Items (Level 2)
        Schema::create('training_template_middle_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('training_template_major_item_id')
                  ->constrained('training_template_major_items', 'id', 'major_item_fk') // Custom FK name to avoid length limit issues if any
                  ->onDelete('cascade');
            $table->string('name');
            $table->integer('sort');

            // Indexes & Unique constraints
            $table->index('training_template_major_item_id', 'middle_item_major_idx');
            $table->unique(['training_template_major_item_id', 'sort'], 'middle_item_major_sort_unique');
        });

        // 4. Minor Items (Level 3)
        Schema::create('training_template_minor_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('training_template_middle_item_id')
                  ->constrained('training_template_middle_items', 'id', 'minor_item_fk') // Custom FK name
                  ->onDelete('cascade');
            $table->string('name');
            $table->integer('sort');

            // Indexes & Unique constraints
            $table->index('training_template_middle_item_id', 'minor_item_middle_idx');
            $table->unique(['training_template_middle_item_id', 'sort'], 'minor_item_middle_sort_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('training_template_minor_items');
        Schema::dropIfExists('training_template_middle_items');
        Schema::dropIfExists('training_template_major_items');
        Schema::dropIfExists('training_templates');
    }
};
