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
        Schema::table('whatsapp_messages', function (Blueprint $table) {
            $table->string('media_type', 20)->nullable()->after('body');
            $table->text('media_url')->nullable()->after('media_type');
            $table->string('media_mimetype')->nullable()->after('media_url');
            $table->string('media_file_name')->nullable()->after('media_mimetype');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('whatsapp_messages', function (Blueprint $table) {
            $table->dropColumn([
                'media_type',
                'media_url',
                'media_mimetype',
                'media_file_name',
            ]);
        });
    }
};
