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
        Schema::create('whatsapp_funnel_steps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('whatsapp_funnel_id')->constrained()->cascadeOnDelete();
            $table->string('type', 20);
            $table->unsignedInteger('sort_order')->default(0);
            $table->json('payload');
            $table->timestamps();

            $table->index(['whatsapp_funnel_id', 'sort_order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('whatsapp_funnel_steps');
    }
};
