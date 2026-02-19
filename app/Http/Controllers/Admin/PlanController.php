<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePlanRequest;
use App\Http\Requests\UpdatePlanRequest;
use App\Models\Plan;
use App\Services\PlanStripeSyncService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class PlanController extends Controller
{
    public function __construct(
        protected PlanStripeSyncService $stripeSyncService
    ) {}

    /**
     * Display a listing of plans.
     */
    public function index(): Response
    {
        $plans = Plan::query()
            ->withCount('manufacturers')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn (Plan $plan) => [
                'id' => $plan->id,
                'name' => $plan->name,
                'description' => $plan->description,
                'is_active' => $plan->is_active,
                'sort_order' => $plan->sort_order,
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
                'stripe_product_id' => $plan->stripe_product_id,
                'stripe_price_id' => $plan->stripe_price_id,
                'manufacturers_count' => $plan->manufacturers_count,
                'created_at' => $plan->created_at->toDateTimeString(),
            ]);

        return Inertia::render('admin/plans/index', [
            'plans' => $plans,
        ]);
    }

    /**
     * Show the form for creating a new plan.
     */
    public function create(): Response
    {
        return Inertia::render('admin/plans/create');
    }

    /**
     * Store a newly created plan.
     */
    public function store(StorePlanRequest $request): RedirectResponse
    {
        $plan = Plan::create([
            ...$request->safe()->except('monthly_price'),
            'monthly_price_cents' => $request->monthlyPriceCents(),
        ]);

        $this->syncToStripe($plan);

        return redirect()->route('admin.plans.index')
            ->with('success', 'Plano criado com sucesso.');
    }

    /**
     * Show the form for editing a plan.
     */
    public function edit(Plan $plan): Response
    {
        return Inertia::render('admin/plans/edit', [
            'plan' => [
                'id' => $plan->id,
                'name' => $plan->name,
                'description' => $plan->description,
                'is_active' => $plan->is_active,
                'sort_order' => $plan->sort_order,
                'monthly_price_cents' => $plan->monthly_price_cents,
                'trial_days' => $plan->trial_days,
                'max_reps' => $plan->max_reps,
                'max_products' => $plan->max_products,
                'max_orders_per_month' => $plan->max_orders_per_month,
                'max_users' => $plan->max_users,
                'max_data_mb' => $plan->max_data_mb,
                'max_files_gb' => $plan->max_files_gb,
                'allow_csv_import' => $plan->allow_csv_import,
                'stripe_product_id' => $plan->stripe_product_id,
                'stripe_price_id' => $plan->stripe_price_id,
            ],
        ]);
    }

    /**
     * Update the specified plan.
     */
    public function update(UpdatePlanRequest $request, Plan $plan): RedirectResponse
    {
        $plan->update([
            ...$request->safe()->except('monthly_price'),
            'monthly_price_cents' => $request->monthlyPriceCents(),
        ]);

        $this->syncToStripe($plan);

        return redirect()->route('admin.plans.index')
            ->with('success', 'Plano atualizado com sucesso.');
    }

    /**
     * Toggle plan active status.
     */
    public function toggle(Plan $plan): RedirectResponse
    {
        $plan->update(['is_active' => ! $plan->is_active]);

        $this->syncToStripe($plan);

        return back()->with('success', $plan->is_active ? 'Plano ativado.' : 'Plano desativado.');
    }

    /**
     * Sync to Stripe only if credentials are configured.
     */
    private function syncToStripe(Plan $plan): void
    {
        if (config('cashier.secret')) {
            $this->stripeSyncService->sync($plan);
        }
    }
}
