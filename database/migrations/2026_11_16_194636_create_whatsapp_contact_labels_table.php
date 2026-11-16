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
        Schema::create('whatsapp_contact_labels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('manufacturer_id')->constrained()->cascadeOnDelete();
            $table->string('name', 40);
            $table->string('name_key', 80);
            $table->string('color', 7);
            $table->unique(['manufacturer_id', 'name_key']);
            $table->timestamps();
        });

        Schema::create('whatsapp_contact_label_links', function (Blueprint $table) {
            $table->foreignId('conversation_id')->constrained('whatsapp_conversations')->cascadeOnDelete();
            $table->foreignId('label_id')->constrained('whatsapp_contact_labels')->cascadeOnDelete();
            $table->primary(['conversation_id', 'label_id']);
            $table->index('label_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('whatsapp_contact_label_links');
        Schema::dropIfExists('whatsapp_contact_labels');
    }
};
