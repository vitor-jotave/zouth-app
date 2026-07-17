<?php

namespace App\Http\Controllers\Manufacturer;

use App\Http\Controllers\Controller;
use App\Http\Requests\ChangeSubscriptionPlanRequest;
use App\Models\Plan;
use App\Services\PlanLimitService;
use App\Services\TenantManager;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Inertia\Inertia;
use Inertia\Response;

class BillingController extends Controller
{
    public function __construct(
        protected TenantManager $tenantManager,
        protected PlanLimitService $limitService
    ) {}

    /**
     * Display the billing page with plans and current subscription.
     */
    public function index(): Response
    {
        $manufacturer = $this->tenantManager->get();

        if (! $manufacturer) {
            abort(403);
        }

        $plans = Plan::where('is_active', true)
            ->orderBy('sort_order')
            ->get()
            ->map(fn (Plan $plan) => [
                'id' => $plan->id,
                'name' => $plan->name,
                'description' => $plan->description,
                'monthly_price_cents' => $plan->monthly_price_cents,
                'formatted_price' => $plan->formatted_price,
                'trial_days' => $plan->trial_days,
                'max_reps' => $plan->max_reps,
                'max_products' => $plan->max_products,
                'max_orders_per_month' => $plan->max_orders_per_month,
                'max_users' => $plan->max_users,
                'max_data_mb' => $plan->max_data_mb,
                'max_files_gb' => $plan->max_files_gb,
                'has_stripe' => $plan->stripe_price_id !== null,
            ]);

        $subscription = $manufacturer->subscription('default');
        $currentPlan = $this->limitService->activePlan($manufacturer);

        return Inertia::render('manufacturer/billing/index', [
            'plans' => $plans,
            'currentPlanId' => $currentPlan?->id,
            'subscription' => $subscription ? [
                'stripe_status' => $subscription->stripe_status,
                'on_trial' => $subscription->onTrial(),
                'trial_ends_at' => $subscription->trial_ends_at?->toDateTimeString(),
                'ends_at' => $subscription->ends_at?->toDateTimeString(),
                'on_grace_period' => $subscription->onGracePeriod(),
                'cancelled' => $subscription->canceled(),
                'active' => $this->limitService->subscriptionGrantsAccess($subscription),
            ] : null,
            'usage' => $this->limitService->usage($manufacturer),
        ]);
    }

    /**
     * Redirect to Stripe Checkout for a new subscription.
     */
    public function checkout(Plan $plan): RedirectResponse
    {
        $manufacturer = $this->tenantManager->get();

        if (! $manufacturer) {
            abort(403);
        }

        if (! $plan->is_active) {
            return redirect()->route('manufacturer.billing.index')
                ->withErrors(['plan_id' => 'Este plano não está disponível.']);
        }

        if (! $plan->stripe_price_id) {
            return redirect()->route('manufacturer.billing.index')
                ->withErrors(['plan_id' => 'Este plano ainda não está configurado para assinaturas.']);
        }

        $existingSubscription = $manufacturer->subscription('default');
        if ($existingSubscription && $existingSubscription->active()) {
            return redirect()->route('manufacturer.billing.index')
                ->withErrors(['plan_id' => 'Você já possui uma assinatura ativa. Use a opção de troca de plano.']);
        }

        $subscriptionBuilder = $manufacturer->newSubscription('default', $plan->stripe_price_id);

        if ($plan->trial_days > 0) {
            $subscriptionBuilder->trialDays($plan->trial_days);
        }

        return $subscriptionBuilder->checkout([
            'success_url' => URL::temporarySignedRoute(
                'manufacturer.billing.checkout.success',
                now()->addHour(),
                ['plan' => $plan->id],
            ),
            'cancel_url' => route('manufacturer.billing.index'),
        ])->redirect();
    }

    /**
     * Handle the return from a successful Stripe Checkout session.
     */
    public function checkoutSuccess(Request $request, Plan $plan): RedirectResponse
    {
        abort_unless($request->hasValidSignature(), 403);

        $manufacturer = $this->tenantManager->get();

        if (! $manufacturer) {
            abort(403);
        }

        return redirect()->route('manufacturer.billing.index')
            ->with('success', 'Checkout recebido. O plano '.$plan->name.' será liberado automaticamente após a confirmação do Stripe.');
    }

    /**
     * Swap to a different plan.
     */
    public function swap(ChangeSubscriptionPlanRequest $request): RedirectResponse
    {
        $manufacturer = $this->tenantManager->get();

        if (! $manufacturer) {
            abort(403);
        }

        $plan = Plan::query()->findOrFail($request->integer('plan_id'));

        if (! $plan->stripe_price_id) {
            return back()->withErrors(['plan_id' => 'Este plano ainda não está configurado para assinaturas.']);
        }

        $subscription = $manufacturer->subscription('default');

        if (! $this->limitService->subscriptionGrantsAccess($subscription)) {
            return back()->withErrors(['plan_id' => 'Você não possui uma assinatura ativa.']);
        }

        $violations = $this->limitService->violatedLimitsForPlan($manufacturer, $plan);

        if (! empty($violations)) {
            return back()
                ->withErrors(['plan_id' => 'Você precisa reduzir seu uso antes de fazer downgrade para este plano.'])
                ->with('downgrade_violations', $violations);
        }

        $subscription->swap($plan->stripe_price_id);

        return redirect()->route('manufacturer.billing.index')
            ->with('success', 'Alteração enviada ao Stripe. O novo plano será liberado após a confirmação.');
    }

    /**
     * Upgrade to a higher plan and redirect back to continue the user's action.
     */
    public function upgrade(ChangeSubscriptionPlanRequest $request): RedirectResponse
    {
        $manufacturer = $this->tenantManager->get();

        if (! $manufacturer) {
            abort(403);
        }

        $plan = Plan::query()->findOrFail($request->integer('plan_id'));

        if (! $plan->stripe_price_id) {
            return back()->withErrors(['plan_id' => 'Este plano ainda não está configurado para assinaturas.']);
        }

        $subscription = $manufacturer->subscription('default');

        if (! $this->limitService->subscriptionGrantsAccess($subscription)) {
            return back()->withErrors(['plan_id' => 'Você não possui uma assinatura ativa.']);
        }

        $currentPlan = $this->limitService->activePlan($manufacturer);

        if (! $currentPlan || $plan->sort_order <= $currentPlan->sort_order) {
            return back()->withErrors(['plan_id' => 'Selecione um plano superior ao seu plano atual.']);
        }

        $subscription->swap($plan->stripe_price_id);

        return back()->with('upgrade_success', [
            'plan_name' => $plan->name,
            'pending_confirmation' => true,
        ]);
    }

    /**
     * Cancel the subscription.
     */
    public function cancel(): RedirectResponse
    {
        $manufacturer = $this->tenantManager->get();

        if (! $manufacturer) {
            abort(403);
        }

        $subscription = $manufacturer->subscription('default');

        if (! $subscription || ! $subscription->active()) {
            return back()->withErrors(['subscription' => 'Nenhuma assinatura ativa encontrada.']);
        }

        $subscription->cancel();

        return back()->with('success', 'Assinatura cancelada. Você terá acesso até o fim do período atual.');
    }

    /**
     * Resume a cancelled subscription.
     */
    public function resume(): RedirectResponse
    {
        $manufacturer = $this->tenantManager->get();

        if (! $manufacturer) {
            abort(403);
        }

        $subscription = $manufacturer->subscription('default');

        if (! $subscription || ! $subscription->onGracePeriod()) {
            return back()->withErrors(['subscription' => 'Não é possível retomar esta assinatura.']);
        }

        $subscription->resume();

        return back()->with('success', 'Assinatura retomada com sucesso!');
    }

    /**
     * Redirect to Stripe Billing Portal.
     */
    public function portal(Request $request): RedirectResponse
    {
        $manufacturer = $this->tenantManager->get();

        if (! $manufacturer) {
            abort(403);
        }

        return $manufacturer->redirectToBillingPortal(
            route('manufacturer.billing.index')
        );
    }
}
