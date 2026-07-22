<?php

namespace App\Http\Controllers;

use App\Enums\UserType;
use App\Http\Requests\CompleteOnboardingRequest;
use App\Http\Requests\StoreOnboardingAccountRequest;
use App\Http\Requests\UpdateOnboardingPreviewRequest;
use App\Http\Requests\UpdateOnboardingProgressRequest;
use App\Models\CatalogSetting;
use App\Models\Manufacturer;
use App\Models\OnboardingSession;
use App\Models\Plan;
use App\Models\User;
use App\Services\PlanLimitService;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class OnboardingController extends Controller
{
    private const SESSION_COOKIE = 'zouth_onboarding';

    public function index(Request $request): Response|RedirectResponse
    {
        $onboardingSession = $this->resolveSession($request);
        $user = $request->user();
        $manufacturer = $user?->isManufacturerUser()
            ? $user->currentManufacturer
            : null;

        if ($manufacturer?->onboarding_completed_at) {
            return redirect()->route('dashboard');
        }

        if ($manufacturer && $onboardingSession->manufacturer_id !== $manufacturer->id) {
            $onboardingSession->update([
                'manufacturer_id' => $manufacturer->id,
                'account_created_at' => $onboardingSession->account_created_at ?? $manufacturer->onboarding_account_created_at ?? now(),
                'last_activity_at' => now(),
            ]);
        }

        $stage = $this->resolveStage($request, $user, $manufacturer, $onboardingSession);
        $catalogSetting = $manufacturer?->catalogSetting;

        return Inertia::render('onboarding/index', [
            'stage' => $stage,
            'incompatibleAccount' => $user && ! $user->isManufacturerUser()
                ? [
                    'type' => $user->user_type->value,
                    'label' => $user->isSalesRep() ? 'representante' : 'administrador',
                ]
                : null,
            'manufacturer' => $manufacturer ? [
                'name' => $manufacturer->name,
                'trial_ends_at' => $manufacturer->trial_ends_at?->toISOString(),
                'onboarding_context' => $manufacturer->onboarding_context ?? [],
                'email_verified' => $user?->hasVerifiedEmail() ?? false,
            ] : null,
            'catalogPreview' => $catalogSetting ? [
                'brand_name' => $catalogSetting->brand_name,
                'accent_color' => $catalogSetting->accent_color ?? '#FF4D3D',
                'logo_url' => $catalogSetting->logo_path
                    ? Storage::url($catalogSetting->logo_path)
                    : null,
            ] : null,
            'session' => [
                'current_step' => $onboardingSession->current_step,
                'context' => $onboardingSession->context ?? [],
            ],
        ]);
    }

    public function progress(
        UpdateOnboardingProgressRequest $request,
    ): RedirectResponse {
        $onboardingSession = $this->resolveSession($request);
        $validated = $request->validated();
        $context = $onboardingSession->context ?? [];

        if (filled($validated['brand_name'] ?? null)) {
            $context['brand_name'] = $validated['brand_name'];
        }

        if (filled($validated['selling_method'] ?? null)) {
            $context['selling_method'] = $validated['selling_method'];
        }

        $onboardingSession->update([
            'current_step' => max($onboardingSession->current_step, (int) $validated['step']),
            'context' => $context,
            'last_activity_at' => now(),
        ]);

        return back();
    }

    public function store(StoreOnboardingAccountRequest $request): RedirectResponse
    {
        if ($request->user()) {
            return redirect()->route('onboarding.index');
        }

        $validated = $request->validated();
        $onboardingSession = $this->resolveSession($request);
        $plans = Plan::query()
            ->where('is_active', true)
            ->where('is_self_service_default', true)
            ->get();

        if ($plans->count() !== 1) {
            throw ValidationException::withMessages([
                'plan' => 'O teste grátis está temporariamente indisponível. Fale com a Zouth para continuar.',
            ]);
        }

        $plan = $plans->firstOrFail();

        if ($plan->trial_days !== 7) {
            throw ValidationException::withMessages([
                'plan' => 'O plano inicial precisa estar configurado com sete dias de teste.',
            ]);
        }

        [$manufacturer, $user] = DB::transaction(function () use ($validated, $onboardingSession, $plan): array {
            $trialStartedAt = now();
            $manufacturer = Manufacturer::create([
                'name' => $validated['brand_name'],
                'slug' => $this->uniqueManufacturerSlug($validated['brand_name']),
                'is_active' => true,
                'current_plan_id' => $plan->id,
                'trial_started_at' => $trialStartedAt,
                'trial_ends_at' => $trialStartedAt->copy()->addDays($plan->trial_days),
                'onboarding_started_at' => $onboardingSession->started_at,
                'onboarding_account_created_at' => now(),
                'onboarding_context' => [
                    'selling_method' => $validated['selling_method'],
                    'source' => $onboardingSession->source,
                ],
            ]);

            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => $validated['password'],
                'user_type' => UserType::ManufacturerUser,
                'current_manufacturer_id' => $manufacturer->id,
            ]);

            $manufacturer->users()->attach($user->id, [
                'role' => 'owner',
                'status' => 'active',
            ]);

            $manufacturer->update(['primary_owner_user_id' => $user->id]);

            CatalogSetting::create([
                'manufacturer_id' => $manufacturer->id,
                ...CatalogSetting::defaults($manufacturer->name),
                'primary_color' => $validated['accent_color'] ?? '#FF4D3D',
                'secondary_color' => '#18181F',
                'accent_color' => $validated['accent_color'] ?? '#FF4D3D',
                'background_color' => '#F6F4F0',
                'public_link_active' => false,
            ]);

            $onboardingSession->update([
                'manufacturer_id' => $manufacturer->id,
                'current_step' => 4,
                'context' => ['selling_method' => $validated['selling_method']],
                'account_created_at' => now(),
                'last_activity_at' => now(),
            ]);

            return [$manufacturer, $user];
        });

        Auth::login($user);
        $request->session()->regenerate();

        return redirect()->route('onboarding.index', ['stage' => 'preview']);
    }

    public function preview(
        UpdateOnboardingPreviewRequest $request,
    ): RedirectResponse {
        $user = $request->user();
        $manufacturer = $user?->currentManufacturer;

        abort_unless($user && $manufacturer, 403);

        $catalogSetting = $manufacturer->catalogSetting()->firstOrCreate(
            ['manufacturer_id' => $manufacturer->id],
            CatalogSetting::defaults($manufacturer->name),
        );
        $validated = $request->validated();
        $logoPath = $catalogSetting->logo_path;

        if ($request->hasFile('logo')) {
            if ($logoPath) {
                Storage::delete($logoPath);
            }

            $logoPath = $request->file('logo')->store('catalog-logos');
        }

        DB::transaction(function () use ($catalogSetting, $manufacturer, $validated, $logoPath): void {
            $catalogSetting->update([
                'accent_color' => $validated['accent_color'],
                'primary_color' => $validated['accent_color'],
                'logo_path' => $logoPath,
                'show_logo' => $logoPath !== null,
            ]);

            $manufacturer->update([
                'logo_path' => $logoPath,
                'onboarding_preview_viewed_at' => now(),
            ]);

            $manufacturer->onboardingSessions()->update([
                'current_step' => 5,
                'preview_viewed_at' => now(),
                'last_activity_at' => now(),
            ]);
        });

        if (! $user->hasVerifiedEmail()) {
            event(new Registered($user));

            return redirect()->route('verification.notice');
        }

        return redirect()->route('onboarding.index', ['verified' => 1]);
    }

    public function complete(CompleteOnboardingRequest $request): RedirectResponse
    {
        $manufacturer = $request->user()?->currentManufacturer;

        abort_unless($manufacturer, 403);

        DB::transaction(function () use ($manufacturer): void {
            $manufacturer->update([
                'onboarding_email_confirmed_at' => $manufacturer->onboarding_email_confirmed_at ?? now(),
                'onboarding_completed_at' => now(),
            ]);

            $manufacturer->onboardingSessions()->update([
                'current_step' => 5,
                'email_confirmed_at' => now(),
                'completed_at' => now(),
                'last_activity_at' => now(),
            ]);
        });

        return $request->validated('next_step') === 'import'
            ? redirect()->route('manufacturer.product-imports.create')
            : redirect()->route('manufacturer.products.create');
    }

    public function paused(Request $request, PlanLimitService $limitService): Response|RedirectResponse
    {
        $manufacturer = $request->user()?->currentManufacturer;

        abort_unless($manufacturer, 403);

        if ($limitService->hasOperationalAccess($manufacturer)) {
            return redirect()->route('dashboard');
        }

        return Inertia::render('onboarding/paused', [
            'manufacturer' => [
                'name' => $manufacturer->name,
                'trial_ended_at' => $manufacturer->trial_ends_at?->toISOString(),
            ],
            'plans' => Plan::query()
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->get()
                ->map(fn (Plan $plan): array => [
                    'id' => $plan->id,
                    'name' => $plan->name,
                    'description' => $plan->description,
                    'formatted_price' => $plan->formatted_price,
                    'has_stripe' => $plan->stripe_price_id !== null,
                ]),
        ]);
    }

    private function resolveSession(Request $request): OnboardingSession
    {
        $publicId = (string) $request->cookie(self::SESSION_COOKIE);
        $onboardingSession = $publicId !== ''
            ? OnboardingSession::query()->where('public_id', $publicId)->first()
            : null;

        if ($onboardingSession?->manufacturer_id && ! $request->user()) {
            $onboardingSession = null;
        }

        if (! $onboardingSession) {
            $onboardingSession = OnboardingSession::create([
                'source' => $request->query('utm_source', 'landing'),
                'referrer' => Str::limit((string) $request->headers->get('referer'), 2048, ''),
                'utm_source' => $request->query('utm_source'),
                'utm_medium' => $request->query('utm_medium'),
                'utm_campaign' => $request->query('utm_campaign'),
                'utm_term' => $request->query('utm_term'),
                'utm_content' => $request->query('utm_content'),
                'current_step' => 1,
                'context' => [],
            ]);

            Cookie::queue(cookie(
                self::SESSION_COOKIE,
                $onboardingSession->public_id,
                60 * 24 * 30,
                '/',
                null,
                app()->isProduction(),
                true,
                false,
                'lax',
            ));
        } else {
            $onboardingSession->update(['last_activity_at' => now()]);
        }

        return $onboardingSession;
    }

    private function resolveStage(
        Request $request,
        ?User $user,
        ?Manufacturer $manufacturer,
        OnboardingSession $onboardingSession,
    ): int {
        if (! $user) {
            $requestedStep = (int) $request->integer('step', $onboardingSession->current_step);

            return min(3, max(1, $requestedStep));
        }

        if (! $user->isManufacturerUser() || ! $manufacturer) {
            return 1;
        }

        if (! $manufacturer->onboarding_preview_viewed_at) {
            return 4;
        }

        return 5;
    }

    private function uniqueManufacturerSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'marca';
        $slug = $base;
        $suffix = 2;

        while (Manufacturer::query()->where('slug', $slug)->exists()) {
            $slug = $base.'-'.$suffix;
            $suffix++;
        }

        return $slug;
    }
}
