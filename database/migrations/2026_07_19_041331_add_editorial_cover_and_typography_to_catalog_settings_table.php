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
            $table->string('heading_font_family')->nullable()->after('font_family');
            $table->string('body_font_family')->nullable()->after('heading_font_family');
            $table->string('cover_image_path')->nullable()->after('logo_path');
            $table->string('cover_thumbnail_path')->nullable()->after('cover_image_path');
            $table->unsignedTinyInteger('cover_image_focal_x')->default(50)->after('cover_thumbnail_path');
            $table->unsignedTinyInteger('cover_image_focal_y')->default(50)->after('cover_image_focal_x');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('catalog_settings', function (Blueprint $table) {
            $table->dropColumn([
                'heading_font_family',
                'body_font_family',
                'cover_image_path',
                'cover_thumbnail_path',
                'cover_image_focal_x',
                'cover_image_focal_y',
            ]);
        });
    }
};
