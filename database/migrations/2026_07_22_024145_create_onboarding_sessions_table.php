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
        Schema::create('onboarding_sessions', function (Blueprint $table) {
            $table->id();
            $table->uuid('public_id')->unique();
            $table->foreignId('manufacturer_id')->nullable()->constrained()->nullOnDelete();
            $table->string('source', 120)->nullable();
            $table->string('referrer', 2048)->nullable();
            $table->string('utm_source', 255)->nullable();
            $table->string('utm_medium', 255)->nullable();
            $table->string('utm_campaign', 255)->nullable();
            $table->string('utm_term', 255)->nullable();
            $table->string('utm_content', 255)->nullable();
            $table->unsignedTinyInteger('current_step')->default(1);
            $table->json('context')->nullable();
            $table->timestamp('started_at');
            $table->timestamp('account_created_at')->nullable();
            $table->timestamp('preview_viewed_at')->nullable();
            $table->timestamp('email_confirmed_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('subscribed_at')->nullable();
            $table->timestamp('last_activity_at');
            $table->timestamps();

            $table->index(['manufacturer_id', 'completed_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('onboarding_sessions');
    }
};
