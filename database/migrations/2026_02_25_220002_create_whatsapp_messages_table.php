<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('whatsapp_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('whatsapp_conversation_id')->constrained()->cascadeOnDelete();
            $table->string('message_id')->unique();
            $table->boolean('from_me')->default(false);
            $table->string('sender_jid')->nullable();
            $table->text('body')->nullable();
            $table->string('status')->default('pending');
            $table->timestamp('message_timestamp')->nullable();
            $table->timestamps();

            $table->index(['whatsapp_conversation_id', 'message_timestamp']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('whatsapp_messages');
    }
};
