<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('whatsapp_instances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('manufacturer_id')->constrained()->cascadeOnDelete();
            $table->string('instance_name')->unique();
            $table->string('instance_id')->nullable();
            $table->string('status')->default('disconnected');
            $table->string('phone_number')->nullable();
            $table->string('profile_name')->nullable();
            $table->string('profile_picture_url')->nullable();
            $table->timestamps();

            $table->index('manufacturer_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('whatsapp_instances');
    }
};
