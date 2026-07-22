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
        Schema::table('plans', function (Blueprint $table) {
            $table->boolean('is_self_service_default')
                ->default(false)
                ->after('is_active')
                ->index();
        });

        $defaultPlanId = DB::table('plans')
            ->where('is_active', true)
            ->where('trial_days', 7)
            ->orderByRaw("case when name = 'Básico' then 0 else 1 end")
            ->orderBy('sort_order')
            ->value('id');

        if ($defaultPlanId) {
            DB::table('plans')
                ->where('id', $defaultPlanId)
                ->update(['is_self_service_default' => true]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropIndex(['is_self_service_default']);
            $table->dropColumn('is_self_service_default');
        });
    }
};
