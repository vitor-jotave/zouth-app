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
        Schema::create('representative_invitations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('manufacturer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('invited_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('affiliation_id')->nullable()->constrained('manufacturer_affiliations')->nullOnDelete();
            $table->string('name');
            $table->string('email');
            $table->string('email_normalized');
            $table->string('whatsapp', 30)->nullable();
            $table->text('personal_message')->nullable();
            $table->char('token_hash', 64)->unique();
            $table->enum('status', ['pending', 'accepted', 'cancelled'])->default('pending');
            $table->timestamp('expires_at');
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('last_sent_at')->nullable();
            $table->unsignedSmallInteger('send_count')->default(1);
            $table->timestamps();

            $table->index(['manufacturer_id', 'email_normalized', 'status'], 'representative_invitation_lookup');
            $table->index(['manufacturer_id', 'status', 'expires_at'], 'representative_invitation_capacity');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('representative_invitations');
    }
};
