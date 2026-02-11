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
        Schema::create('catalog_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('manufacturer_id')->constrained()->cascadeOnDelete();
            $table->string('brand_name');
            $table->string('tagline')->nullable();
            $table->text('description')->nullable();
            $table->string('logo_path')->nullable();
            $table->string('primary_color', 7)->default('#0F766E');
            $table->string('secondary_color', 7)->default('#0F172A');
            $table->string('accent_color', 7)->default('#F97316');
            $table->string('background_color', 7)->default('#F8FAFC');
            $table->string('font_family')->default('space-grotesk');
            $table->string('public_token', 64)->unique();
            $table->timestamp('public_token_rotated_at')->nullable();
            $table->boolean('public_link_active')->default(true);
            $table->timestamps();

            $table->unique('manufacturer_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('catalog_settings');
    }
};
