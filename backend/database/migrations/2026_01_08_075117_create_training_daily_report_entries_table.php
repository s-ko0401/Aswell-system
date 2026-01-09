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
        Schema::create('training_daily_report_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('daily_report_id')->constrained('training_daily_reports')->onDelete('cascade');
            $table->time('start_time');
            $table->time('end_time');
            $table->string('work_place');
            $table->string('instructor');
            $table->text('content');
            $table->text('achievement');
            $table->integer('sort')->default(0);
            $table->timestamps();

            $table->index(['daily_report_id', 'sort']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('training_daily_report_entries');
    }
};
