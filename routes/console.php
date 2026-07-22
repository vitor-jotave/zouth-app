<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('auth:clear-resets')->daily();
Schedule::command('queue:prune-batches')->daily();
Schedule::command('queue:prune-failed --hours=168')->daily();
Schedule::command('app:anonymize-catalog-visits')->daily();
Schedule::command('app:purge-expired-product-import-files')->dailyAt('03:20');
Schedule::command('app:send-trial-lifecycle-notifications')->hourly()->withoutOverlapping();
