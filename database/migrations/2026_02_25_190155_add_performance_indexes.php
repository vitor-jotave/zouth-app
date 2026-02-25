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
        Schema::table('manufacturer_affiliations', function (Blueprint $table) {
            $table->index(['user_id', 'status']);
        });

        Schema::table('catalog_visits', function (Blueprint $table) {
            $table->index('public_token');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('manufacturer_affiliations', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'status']);
        });

        Schema::table('catalog_visits', function (Blueprint $table) {
            $table->dropIndex(['public_token']);
        });
    }
};
