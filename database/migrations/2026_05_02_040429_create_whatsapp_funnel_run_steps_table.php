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
        Schema::create('whatsapp_funnel_run_steps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('whatsapp_funnel_run_id')->constrained()->cascadeOnDelete();
            $table->foreignId('whatsapp_funnel_step_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('whatsapp_message_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type', 20);
            $table->unsignedInteger('sort_order')->default(0);
            $table->json('payload');
            $table->string('status', 20)->default('pending');
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->index(['whatsapp_funnel_run_id', 'status', 'sort_order'], 'whatsapp_funnel_run_steps_status_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('whatsapp_funnel_run_steps');
    }
};
