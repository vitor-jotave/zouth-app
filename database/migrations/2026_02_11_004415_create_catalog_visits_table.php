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
        Schema::create('catalog_visits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('catalog_setting_id')->constrained()->cascadeOnDelete();
            $table->foreignId('manufacturer_id')->constrained()->cascadeOnDelete();
            $table->string('public_token', 64);
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->text('referer')->nullable();
            $table->timestamp('visited_at');
            $table->timestamps();

            $table->index(['manufacturer_id', 'visited_at']);
            $table->index(['catalog_setting_id', 'visited_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('catalog_visits');
    }
};
