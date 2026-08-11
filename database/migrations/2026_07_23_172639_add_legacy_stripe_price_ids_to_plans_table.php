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
            $table->json('legacy_stripe_price_ids')->nullable()->after('stripe_price_id');
        });

        DB::table('subscriptions')
            ->join('manufacturers', 'manufacturers.id', '=', 'subscriptions.manufacturer_id')
            ->whereNotNull('manufacturers.current_plan_id')
            ->whereNotNull('subscriptions.stripe_price')
            ->whereIn('subscriptions.stripe_status', ['active', 'trialing'])
            ->select([
                'manufacturers.current_plan_id as plan_id',
                'subscriptions.stripe_price',
            ])
            ->distinct()
            ->get()
            ->groupBy('plan_id')
            ->each(function ($subscriptions, int|string $planId): void {
                DB::table('plans')
                    ->where('id', $planId)
                    ->update([
                        'legacy_stripe_price_ids' => json_encode(
                            $subscriptions
                                ->pluck('stripe_price')
                                ->filter()
                                ->unique()
                                ->values()
                                ->all(),
                            JSON_THROW_ON_ERROR,
                        ),
                    ]);
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn('legacy_stripe_price_ids');
        });
    }
};
