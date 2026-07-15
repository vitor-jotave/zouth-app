<?php

namespace App\Http\Controllers\Admin;

use App\Enums\OrderStatus;
use App\Enums\UserType;
use App\Http\Controllers\Controller;
use App\Models\Manufacturer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Plan;
use App\Models\User;
use App\Services\PlanLimitService;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Cashier\Subscription;

class DashboardController extends Controller
{
    /**
     * Display the admin dashboard.
     */
    public function __invoke(): Response
    {
        $entitledSubscriptions = Subscription::query()
            ->whereIn('stripe_status', PlanLimitService::ENTITLED_SUBSCRIPTION_STATUSES)
            ->whereNotNull('stripe_price')
            ->where(function ($query) {
                $query->whereNull('ends_at')
                    ->orWhere('ends_at', '>', now());
            })
            ->get(['manufacturer_id', 'stripe_price'])
            ->unique('manufacturer_id');

        $prices = Plan::query()
            ->whereIn('stripe_price_id', $entitledSubscriptions->pluck('stripe_price'))
            ->pluck('monthly_price_cents', 'stripe_price_id');

        $volumeLast30Days = OrderItem::query()
            ->whereHas('order', fn ($query) => $query
                ->where('created_at', '>=', now()->subDays(30))
                ->where('status', '!=', OrderStatus::Cancelled->value))
            ->selectRaw('COALESCE(SUM(unit_price * quantity), 0) as aggregate')
            ->value('aggregate');

        $stats = [
            'active_manufacturers' => Manufacturer::query()->where('is_active', true)->count(),
            'total_manufacturers' => Manufacturer::query()->count(),
            'paying_manufacturers' => $entitledSubscriptions->count(),
            'monthly_recurring_revenue' => $entitledSubscriptions
                ->sum(fn (Subscription $subscription) => $prices->get($subscription->stripe_price, 0)) / 100,
            'sales_reps' => User::query()->where('user_type', UserType::SalesRep->value)->count(),
            'orders_last_30_days' => Order::query()->where('created_at', '>=', now()->subDays(30))->count(),
            'volume_last_30_days' => (float) $volumeLast30Days,
        ];

        return Inertia::render('admin/dashboard', [
            'stats' => $stats,
            'recentManufacturers' => Manufacturer::query()
                ->with('currentPlan:id,name')
                ->withCount(['products', 'orders'])
                ->latest()
                ->limit(5)
                ->get()
                ->map(fn (Manufacturer $manufacturer) => [
                    'id' => $manufacturer->id,
                    'name' => $manufacturer->name,
                    'is_active' => $manufacturer->is_active,
                    'plan_name' => $manufacturer->currentPlan?->name,
                    'products_count' => $manufacturer->products_count,
                    'orders_count' => $manufacturer->orders_count,
                    'created_at' => $manufacturer->created_at->toISOString(),
                ]),
        ]);
    }
}
