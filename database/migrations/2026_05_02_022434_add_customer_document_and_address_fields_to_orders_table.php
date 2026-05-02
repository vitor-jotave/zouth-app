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
            $table->string('customer_document_type', 10)->nullable()->after('customer_email');
            $table->string('customer_document', 14)->nullable()->after('customer_document_type');
            $table->string('customer_zip_code', 8)->nullable()->after('customer_notes');
            $table->string('customer_state', 2)->nullable()->after('customer_zip_code');
            $table->string('customer_city')->nullable()->after('customer_state');
            $table->string('customer_neighborhood')->nullable()->after('customer_city');
            $table->string('customer_street')->nullable()->after('customer_neighborhood');
            $table->string('customer_address_number', 20)->nullable()->after('customer_street');
            $table->string('customer_address_complement')->nullable()->after('customer_address_number');
            $table->string('customer_address_reference')->nullable()->after('customer_address_complement');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'customer_document_type',
                'customer_document',
                'customer_zip_code',
                'customer_state',
                'customer_city',
                'customer_neighborhood',
                'customer_street',
                'customer_address_number',
                'customer_address_complement',
                'customer_address_reference',
            ]);
        });
    }
};
