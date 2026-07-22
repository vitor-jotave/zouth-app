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
            $table->timestamp('trial_started_at')->nullable()->after('trial_ends_at');
            $table->timestamp('trial_expired_at')->nullable()->after('trial_started_at');
            $table->timestamp('onboarding_started_at')->nullable()->after('trial_expired_at');
            $table->timestamp('onboarding_account_created_at')->nullable()->after('onboarding_started_at');
            $table->timestamp('onboarding_preview_viewed_at')->nullable()->after('onboarding_account_created_at');
            $table->timestamp('onboarding_email_confirmed_at')->nullable()->after('onboarding_preview_viewed_at');
            $table->timestamp('onboarding_completed_at')->nullable()->after('onboarding_email_confirmed_at');
            $table->json('onboarding_context')->nullable()->after('onboarding_completed_at');
            $table->timestamp('welcome_sent_at')->nullable()->after('onboarding_context');
            $table->timestamp('trial_three_days_sent_at')->nullable()->after('welcome_sent_at');
            $table->timestamp('trial_last_day_sent_at')->nullable()->after('trial_three_days_sent_at');
            $table->timestamp('trial_paused_sent_at')->nullable()->after('trial_last_day_sent_at');
        });

        DB::table('manufacturers')
            ->whereNull('onboarding_completed_at')
            ->update([
                'onboarding_started_at' => now(),
                'onboarding_account_created_at' => now(),
                'onboarding_preview_viewed_at' => now(),
                'onboarding_email_confirmed_at' => now(),
                'onboarding_completed_at' => now(),
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('manufacturers', function (Blueprint $table) {
            $table->dropColumn([
                'trial_started_at',
                'trial_expired_at',
                'onboarding_started_at',
                'onboarding_account_created_at',
                'onboarding_preview_viewed_at',
                'onboarding_email_confirmed_at',
                'onboarding_completed_at',
                'onboarding_context',
                'welcome_sent_at',
                'trial_three_days_sent_at',
                'trial_last_day_sent_at',
                'trial_paused_sent_at',
            ]);
        });
    }
};
