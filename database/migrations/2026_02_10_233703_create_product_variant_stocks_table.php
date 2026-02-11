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
        Schema::create('product_variant_stocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->enum('size', ['RN', 'P', 'M', 'G'])->nullable();
            $table->foreignId('product_color_id')->nullable()->constrained('product_colors')->cascadeOnDelete();
            $table->unsignedInteger('quantity')->default(0);
            $table->string('sku_variant')->nullable();
            $table->timestamps();

            $table->unique(['product_id', 'size', 'product_color_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_variant_stocks');
    }
};
