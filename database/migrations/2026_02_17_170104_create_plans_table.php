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
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->unsignedInteger('monthly_price_cents');
            $table->string('currency', 3)->default('BRL');
            $table->unsignedInteger('trial_days')->default(0);
            $table->unsignedInteger('max_reps')->nullable();
            $table->unsignedInteger('max_products')->nullable();
            $table->unsignedInteger('max_orders_per_month')->nullable();
            $table->unsignedInteger('max_users')->nullable();
            $table->unsignedInteger('max_data_mb')->nullable();
            $table->unsignedInteger('max_files_gb')->nullable();
            $table->boolean('allow_csv_import')->default(false);
            $table->string('stripe_product_id')->nullable()->unique();
            $table->string('stripe_price_id')->nullable()->unique();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('plans');
    }
};
