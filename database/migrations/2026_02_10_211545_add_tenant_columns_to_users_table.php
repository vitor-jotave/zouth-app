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
        Schema::table('users', function (Blueprint $table) {
            $table->enum('user_type', ['superadmin', 'manufacturer_user', 'sales_rep'])->after('email');
            $table->foreignId('current_manufacturer_id')
                ->nullable()
                ->after('user_type')
                ->constrained('manufacturers')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['current_manufacturer_id']);
            $table->dropColumn(['user_type', 'current_manufacturer_id']);
        });
    }
};
