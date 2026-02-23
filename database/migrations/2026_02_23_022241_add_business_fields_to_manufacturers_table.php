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
        Schema::table('manufacturers', function (Blueprint $table) {
            $table->string('cnpj', 18)->nullable()->unique()->after('slug');
            $table->string('phone', 20)->nullable()->after('cnpj');
            $table->string('logo_path')->nullable()->after('phone');
            $table->string('zip_code', 9)->nullable()->after('logo_path');
            $table->string('state', 2)->nullable()->after('zip_code');
            $table->string('city', 100)->nullable()->after('state');
            $table->string('neighborhood', 100)->nullable()->after('city');
            $table->string('street', 255)->nullable()->after('neighborhood');
            $table->string('address_number', 20)->nullable()->after('street');
            $table->string('complement', 100)->nullable()->after('address_number');
        });
    }

    public function down(): void
    {
        Schema::table('manufacturers', function (Blueprint $table) {
            $table->dropColumn([
                'cnpj', 'phone', 'logo_path',
                'zip_code', 'state', 'city', 'neighborhood',
                'street', 'address_number', 'complement',
            ]);
        });
    }
};
