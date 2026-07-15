<?php

namespace App\Http\Controllers;

use App\Models\Manufacturer;
use App\Models\Plan;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Inertia\Inertia;
use Inertia\Response;

class PlanSelectionController extends Controller
{
    /**
     * Show the plan selection page (requires valid signed URL).
     */
    public function show(Request $request, Manufacturer $manufacturer): Response
    {
        abort_unless($request->hasValidSignature(), 403);

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

        $checkoutUrls = $plans->mapWithKeys(fn (array $plan) => [
            $plan['id'] => URL::temporarySignedRoute(
                'plan-selection.checkout',
                now()->addDays(3),
                ['manufacturer' => $manufacturer->id, 'plan' => $plan['id']],
            ),
        ]);

        return Inertia::render('plan-selection/index', [
            'manufacturer' => [
                'id' => $manufacturer->id,
                'name' => $manufacturer->name,
            ],
            'plans' => $plans,
            'checkoutUrls' => $checkoutUrls,
        ]);
    }

    /**
     * Redirect to Stripe Checkout for the selected plan (requires valid signed URL).
     */
    public function checkout(Request $request, Manufacturer $manufacturer, Plan $plan): RedirectResponse
    {
        abort_unless($request->hasValidSignature(), 403);

        if (! $plan->is_active) {
            return back()->withErrors(['plan_id' => 'Este plano não está disponível.']);
        }

        if (! $plan->stripe_price_id) {
            return back()->withErrors(['plan_id' => 'Este plano ainda não está configurado para assinaturas.']);
        }

        $existingSubscription = $manufacturer->subscription('default');

        if ($existingSubscription && $existingSubscription->active()) {
            return back()->withErrors(['plan_id' => 'Este fabricante já possui uma assinatura ativa.']);
        }

        $subscriptionBuilder = $manufacturer->newSubscription('default', $plan->stripe_price_id);

        if ($plan->trial_days > 0) {
            $subscriptionBuilder->trialDays($plan->trial_days);
        }

        return $subscriptionBuilder->checkout([
            'success_url' => URL::temporarySignedRoute(
                'plan-selection.checkout.success',
                now()->addHour(),
                ['manufacturer' => $manufacturer->id, 'plan' => $plan->id],
            ),
            'cancel_url' => URL::temporarySignedRoute(
                'plan-selection.show',
                now()->addDays(3),
                ['manufacturer' => $manufacturer->id],
            ),
        ])->redirect();
    }

    public function checkoutSuccess(Request $request, Manufacturer $manufacturer, Plan $plan): RedirectResponse
    {
        abort_unless($request->hasValidSignature(), 403);

        return redirect()->route('login')
            ->with('status', 'Recebemos seu checkout do plano '.$plan->name.'. A assinatura está sendo confirmada pelo Stripe e será liberada automaticamente.');
    }
}
