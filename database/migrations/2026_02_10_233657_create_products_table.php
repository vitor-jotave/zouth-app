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
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('manufacturer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_category_id')->nullable()->constrained('product_categories')->nullOnDelete();
            $table->string('name');
            $table->string('sku');
            $table->text('description')->nullable();
            $table->boolean('has_size_variants')->default(false);
            $table->boolean('has_color_variants')->default(false);
            $table->unsignedInteger('base_quantity')->default(0);
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['manufacturer_id', 'sku']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
