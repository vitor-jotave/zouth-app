<?php

namespace App\Http\Controllers\Manufacturer;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Services\PlanLimitService;
use App\Services\TenantManager;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
                'allow_csv_import' => $plan->allow_csv_import,
                'has_stripe' => $plan->stripe_price_id !== null,
            ]);

        $subscription = $manufacturer->subscription('default');
        $currentPlan = $manufacturer->currentPlan;

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
                'active' => $subscription->active(),
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
            'success_url' => route('manufacturer.billing.checkout.success', $plan),
            'cancel_url' => route('manufacturer.billing.index'),
        ])->redirect();
    }

    /**
     * Handle the return from a successful Stripe Checkout session.
     */
    public function checkoutSuccess(Plan $plan): RedirectResponse
    {
        $manufacturer = $this->tenantManager->get();

        if (! $manufacturer) {
            abort(403);
        }

        $manufacturer->update(['current_plan_id' => $plan->id]);

        return redirect()->route('manufacturer.billing.index')
            ->with('success', 'Assinatura realizada com sucesso! Bem-vindo ao plano '.$plan->name.'.');
    }

    /**
     * Swap to a different plan.
     */
    public function swap(Request $request): RedirectResponse
    {
        $request->validate([
            'plan_id' => ['required', 'exists:plans,id'],
        ]);

        $manufacturer = $this->tenantManager->get();

        if (! $manufacturer) {
            abort(403);
        }

        $plan = Plan::findOrFail($request->plan_id);

        if (! $plan->stripe_price_id) {
            return back()->withErrors(['plan_id' => 'Este plano ainda não está configurado para assinaturas.']);
        }

        $subscription = $manufacturer->subscription('default');

        if (! $subscription || ! $subscription->active()) {
            return back()->withErrors(['plan_id' => 'Você não possui uma assinatura ativa.']);
        }

        $violations = $this->limitService->violatedLimitsForPlan($manufacturer, $plan);

        if (! empty($violations)) {
            return back()
                ->withErrors(['plan_id' => 'Você precisa reduzir seu uso antes de fazer downgrade para este plano.'])
                ->with('downgrade_violations', $violations);
        }

        $subscription->swap($plan->stripe_price_id);

        $manufacturer->update(['current_plan_id' => $plan->id]);

        return redirect()->route('manufacturer.billing.index')
            ->with('success', 'Plano alterado com sucesso!');
    }

    /**
     * Upgrade to a higher plan and redirect back to continue the user's action.
     */
    public function upgrade(Request $request): RedirectResponse
    {
        $request->validate([
            'plan_id' => ['required', 'exists:plans,id'],
        ]);

        $manufacturer = $this->tenantManager->get();

        if (! $manufacturer) {
            abort(403);
        }

        $plan = Plan::findOrFail($request->plan_id);

        if (! $plan->stripe_price_id) {
            return back()->withErrors(['plan_id' => 'Este plano ainda não está configurado para assinaturas.']);
        }

        $subscription = $manufacturer->subscription('default');

        if (! $subscription || ! $subscription->active()) {
            return back()->withErrors(['plan_id' => 'Você não possui uma assinatura ativa.']);
        }

        $subscription->swap($plan->stripe_price_id);

        $manufacturer->update(['current_plan_id' => $plan->id]);

        return back()->with('upgrade_success', ['plan_name' => $plan->name]);
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
