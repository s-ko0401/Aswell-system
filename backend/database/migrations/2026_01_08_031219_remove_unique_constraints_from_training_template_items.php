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
        Schema::table('training_template_major_items', function (Blueprint $table) {
            $table->dropUnique(['training_template_id', 'sort']);
        });

        Schema::table('training_template_middle_items', function (Blueprint $table) {
            $table->dropUnique('middle_item_major_sort_unique');
        });

        Schema::table('training_template_minor_items', function (Blueprint $table) {
            $table->dropUnique('minor_item_middle_sort_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('training_template_major_items', function (Blueprint $table) {
            $table->unique(['training_template_id', 'sort']);
        });

        Schema::table('training_template_middle_items', function (Blueprint $table) {
            $table->unique(['training_template_major_item_id', 'sort'], 'middle_item_major_sort_unique');
        });

        Schema::table('training_template_minor_items', function (Blueprint $table) {
            $table->unique(['training_template_middle_item_id', 'sort'], 'minor_item_middle_sort_unique');
        });
    }
};
