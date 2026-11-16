<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('manufacturer_affiliations', function (Blueprint $table) {
            $table->uuid('tracking_token')->nullable()->unique();
        });

        DB::table('manufacturer_affiliations')->select('id')->chunkById(500, function ($rows): void {
            foreach ($rows as $row) {
                DB::table('manufacturer_affiliations')->where('id', $row->id)->update(['tracking_token' => (string) Str::uuid()]);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('manufacturer_affiliations', function (Blueprint $table) {
            $table->dropUnique(['tracking_token']);
            $table->dropColumn('tracking_token');
        });
    }
};
