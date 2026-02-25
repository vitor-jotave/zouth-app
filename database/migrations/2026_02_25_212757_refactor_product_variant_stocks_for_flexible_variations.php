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
        Schema::table('product_variant_stocks', function (Blueprint $table) {
            // Drop old unique constraint
            $table->dropUnique(['product_id', 'size', 'product_color_id']);

            // Drop old foreign key and columns
            $table->dropForeign(['product_color_id']);
            $table->dropColumn(['size', 'product_color_id']);

            // Add new flexible columns
            $table->json('variation_key')->after('product_id');
            $table->unsignedBigInteger('price_cents')->nullable()->after('quantity');
        });
    }

    public function down(): void
    {
        Schema::table('product_variant_stocks', function (Blueprint $table) {
            $table->dropColumn(['variation_key', 'price_cents']);

            $table->enum('size', ['RN', 'P', 'M', 'G'])->nullable()->after('product_id');
            $table->foreignId('product_color_id')->nullable()->after('size')->constrained()->nullOnDelete();
            $table->unique(['product_id', 'size', 'product_color_id']);
        });
    }
};
