<?php

namespace App\Console\Commands;

use App\Models\Manufacturer;
use App\Notifications\TrialEndingNotification;
use App\Notifications\TrialPausedNotification;
use App\Services\PlanLimitService;
use Illuminate\Console\Command;

class SendTrialLifecycleNotifications extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:send-trial-lifecycle-notifications';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Envia lembretes e pausa contas quando o teste grátis termina';

    /**
     * Execute the console command.
     */
    public function handle(PlanLimitService $planLimitService): int
    {
        Manufacturer::query()
            ->with(['primaryOwner', 'subscriptions'])
            ->whereNotNull('trial_started_at')
            ->whereNotNull('trial_ends_at')
            ->chunkById(100, function ($manufacturers) use ($planLimitService): void {
                foreach ($manufacturers as $manufacturer) {
                    $owner = $manufacturer->primaryOwner;

                    if (! $owner || $planLimitService->subscriptionGrantsAccess($manufacturer->subscription('default'))) {
                        continue;
                    }

                    $daysRemaining = $manufacturer->trial_ends_at->isFuture()
                        ? (int) now()->startOfDay()->diffInDays($manufacturer->trial_ends_at->startOfDay())
                        : 0;

                    if ($daysRemaining === 3 && $manufacturer->trial_three_days_sent_at === null) {
                        $manufacturer->update(['trial_three_days_sent_at' => now()]);
                        $owner->notify(new TrialEndingNotification($manufacturer, 3));
                    }

                    if ($daysRemaining === 1 && $manufacturer->trial_last_day_sent_at === null) {
                        $manufacturer->update(['trial_last_day_sent_at' => now()]);
                        $owner->notify(new TrialEndingNotification($manufacturer, 1));
                    }

                    if ($planLimitService->genericTrialHasExpired($manufacturer)) {
                        $shouldNotify = $manufacturer->trial_paused_sent_at === null;

                        $manufacturer->update([
                            'trial_expired_at' => $manufacturer->trial_expired_at ?? now(),
                            'trial_paused_sent_at' => $shouldNotify ? now() : $manufacturer->trial_paused_sent_at,
                        ]);

                        if ($shouldNotify) {
                            $owner->notify(new TrialPausedNotification($manufacturer));
                        }
                    }
                }
            });

        return self::SUCCESS;
    }
}
