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
        Schema::create('assisted_selections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('manufacturer_affiliation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('catalog_setting_id')->constrained()->cascadeOnDelete();
            $table->uuid('token')->unique();
            $table->json('items');
            $table->timestamp('expires_at')->index();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assisted_selections');
    }
};
