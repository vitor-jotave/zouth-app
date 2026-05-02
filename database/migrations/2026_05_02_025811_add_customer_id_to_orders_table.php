<?php

use App\Services\CustomerService;
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
            $table->foreignId('customer_id')->nullable()->after('manufacturer_id')->constrained()->nullOnDelete();
            $table->index(['manufacturer_id', 'customer_id', 'created_at']);
        });

        app(CustomerService::class)->backfillOrdersWithoutCustomers();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['manufacturer_id', 'customer_id', 'created_at']);
            $table->dropConstrainedForeignId('customer_id');
        });
    }
};
