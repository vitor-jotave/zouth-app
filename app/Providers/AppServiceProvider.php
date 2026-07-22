<?php

namespace App\Providers;

use App\Http\Responses\LoginResponse;
use App\Http\Responses\RegisterResponse;
use App\Http\Responses\VerifyEmailResponse;
use App\Listeners\StripeEventListener;
use App\Services\EvolutionApiService;
use App\Services\TenantManager;
use Carbon\CarbonImmutable;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Queue\Events\JobFailed;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Laravel\Cashier\Cashier;
use Laravel\Cashier\Events\WebhookReceived;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;
use Laravel\Fortify\Contracts\RegisterResponse as RegisterResponseContract;
use Laravel\Fortify\Contracts\VerifyEmailResponse as VerifyEmailResponseContract;
use Symfony\Component\HttpFoundation\Response;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(TenantManager::class);
        $this->app->singleton(EvolutionApiService::class);
        $this->app->singleton(LoginResponseContract::class, LoginResponse::class);
        $this->app->singleton(RegisterResponseContract::class, RegisterResponse::class);
        $this->app->singleton(VerifyEmailResponseContract::class, VerifyEmailResponse::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Cashier::useCustomerModel(\App\Models\Manufacturer::class);

        Event::listen(WebhookReceived::class, StripeEventListener::class);

        $this->configureDefaults();
        $this->configureQueueMonitoring();
        $this->configureRateLimiting();
        $this->configureUrl();
    }

    /**
     * Emit a structured critical log whenever a queued job fails permanently.
     */
    protected function configureQueueMonitoring(): void
    {
        Queue::failing(function (JobFailed $event): void {
            Log::critical('Queue job failed.', [
                'connection' => $event->connectionName,
                'queue' => $event->job->getQueue(),
                'job' => $event->job->resolveName(),
                'exception' => $event->exception,
            ]);
        });
    }

    /**
     * Limit webhook traffic without penalizing valid delivery bursts.
     */
    protected function configureRateLimiting(): void
    {
        RateLimiter::for('onboarding-progress', function (Request $request): array {
            return [
                Limit::perMinute(180)
                    ->by('onboarding-progress-ip:'.$request->ip()),
                Limit::perMinute(30)
                    ->by('onboarding-progress-visitor:'.$this->onboardingVisitorKey($request)),
            ];
        });

        RateLimiter::for('onboarding-account', function (Request $request): array {
            $visitorKey = $this->onboardingVisitorKey($request);

            return [
                Limit::perMinute(120)
                    ->by('onboarding-account-ip:'.$request->ip()),
                Limit::perMinute(10)
                    ->by('onboarding-account-minute:'.$visitorKey),
                Limit::perHour(30)
                    ->by('onboarding-account-hour:'.$visitorKey),
            ];
        });

        RateLimiter::for('onboarding-authenticated', function (Request $request): Limit {
            return Limit::perMinute(30)
                ->by('onboarding-user:'.($request->user()?->getAuthIdentifier() ?? $request->ip()));
        });

        RateLimiter::for('evolution-webhook', function (Request $request): array {
            return [
                Limit::perMinute(max(1, (int) config('evolution.webhook_invalid_rate_limit')))
                    ->by('invalid:'.$request->ip())
                    ->after(fn (Response $response): bool => in_array($response->getStatusCode(), [401, 404], true)),
                Limit::perMinute(max(1, (int) config('evolution.webhook_rate_limit')))
                    ->by('instance:'.$request->route('instanceName')),
            ];
        });
    }

    /**
     * Build a privacy-safe key that isolates each onboarding visitor.
     */
    protected function onboardingVisitorKey(Request $request): string
    {
        $email = Str::lower(trim((string) $request->input('email')));
        $identity = $email !== ''
            ? $email
            : (string) $request->cookie('zouth_onboarding', $request->ip());

        return hash('sha256', $identity);
    }

    /**
     * Force URL generation only in production environment.
     */
    protected function configureUrl(): void
    {
        if (app()->environment('production')) {
            $appUrl = config('app.url');

            if (! empty($appUrl)) {
                URL::forceRootUrl($appUrl);
            }

            URL::forceScheme('https');
        }
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null
        );
    }
}
