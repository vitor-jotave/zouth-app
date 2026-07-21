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
        Schema::table('product_media', function (Blueprint $table) {
            $table->string('thumbnail_path')->nullable()->after('path');
            $table->unsignedBigInteger('thumbnail_size_bytes')->nullable()->after('file_size_bytes');
            $table->unsignedInteger('width')->nullable()->after('thumbnail_size_bytes');
            $table->unsignedInteger('height')->nullable()->after('width');
            $table->timestamp('optimized_at')->nullable()->after('height');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('product_media', function (Blueprint $table) {
            $table->dropColumn([
                'thumbnail_path',
                'thumbnail_size_bytes',
                'width',
                'height',
                'optimized_at',
            ]);
        });
    }
};
