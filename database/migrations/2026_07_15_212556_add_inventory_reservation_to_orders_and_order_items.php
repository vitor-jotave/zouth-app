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
        Schema::table('orders', function (Blueprint $table) {
            $table->timestamp('inventory_reserved_at')->nullable();
            $table->timestamp('inventory_released_at')->nullable();
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->foreignId('product_variant_stock_id')
                ->nullable()
                ->constrained('product_variant_stocks')
                ->nullOnDelete();
            $table->json('selected_variations')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('product_variant_stock_id');
            $table->dropColumn('selected_variations');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['inventory_reserved_at', 'inventory_released_at']);
        });
    }
};
