<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('manufacturers', function (Blueprint $table) {
            $table->foreignId('primary_owner_user_id')
                ->nullable()
                ->after('id')
                ->constrained('users')
                ->restrictOnDelete();
        });

        DB::table('manufacturers')
            ->orderBy('id')
            ->eachById(function (object $manufacturer): void {
                $primaryOwnerId = DB::table('manufacturer_user')
                    ->where('manufacturer_id', $manufacturer->id)
                    ->where('role', 'owner')
                    ->orderByRaw("CASE WHEN status = 'active' THEN 0 ELSE 1 END")
                    ->orderBy('created_at')
                    ->value('user_id');

                if ($primaryOwnerId) {
                    DB::table('manufacturers')
                        ->where('id', $manufacturer->id)
                        ->update(['primary_owner_user_id' => $primaryOwnerId]);
                }
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('manufacturers', function (Blueprint $table) {
            $table->dropConstrainedForeignId('primary_owner_user_id');
        });
    }
};
