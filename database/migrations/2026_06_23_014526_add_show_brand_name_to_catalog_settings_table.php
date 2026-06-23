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
        Schema::table('catalog_settings', function (Blueprint $table) {
            $table->boolean('show_brand_name')->default(true)->after('brand_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('catalog_settings', function (Blueprint $table) {
            $table->dropColumn('show_brand_name');
        });
    }
};
