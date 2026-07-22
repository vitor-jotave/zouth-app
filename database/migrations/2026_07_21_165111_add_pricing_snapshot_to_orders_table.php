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
            $table->unsignedBigInteger('subtotal_cents')->nullable()->after('status');
            $table->unsignedBigInteger('discount_cents')->nullable()->after('subtotal_cents');
            $table->unsignedBigInteger('total_cents')->nullable()->after('discount_cents');
            $table->json('applied_order_rules')->nullable()->after('total_cents');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'subtotal_cents',
                'discount_cents',
                'total_cents',
                'applied_order_rules',
            ]);
        });
    }
};
