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
            // Layout preset fields
            $table->string('layout_preset')->default('minimal')->after('font_family');
            $table->string('layout_density')->default('comfortable')->after('layout_preset');
            $table->string('card_style')->default('soft')->after('layout_density');

            // Background fields
            $table->string('background_mode')->default('solid')->after('background_color');
            $table->string('background_image_path')->nullable()->after('background_mode');
            $table->unsignedTinyInteger('background_image_opacity')->default(20)->after('background_image_path');
            $table->string('background_overlay_color', 7)->default('#000000')->after('background_image_opacity');
            $table->unsignedTinyInteger('background_overlay_opacity')->default(10)->after('background_overlay_color');
            $table->unsignedTinyInteger('background_blur')->default(0)->after('background_overlay_opacity');
            $table->string('pattern_id')->nullable()->after('background_blur');
            $table->string('pattern_color', 7)->nullable()->after('pattern_id');
            $table->unsignedTinyInteger('pattern_opacity')->default(12)->after('pattern_color');
            $table->string('gradient_id')->nullable()->after('pattern_opacity');

            // Sections (JSON array)
            $table->json('sections')->nullable()->after('gradient_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('catalog_settings', function (Blueprint $table) {
            $table->dropColumn([
                'layout_preset',
                'layout_density',
                'card_style',
                'background_mode',
                'background_image_path',
                'background_image_opacity',
                'background_overlay_color',
                'background_overlay_opacity',
                'background_blur',
                'pattern_id',
                'pattern_color',
                'pattern_opacity',
                'gradient_id',
                'sections',
            ]);
        });
    }
};
