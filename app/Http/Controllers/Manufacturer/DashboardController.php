<?php

namespace App\Http\Controllers\Manufacturer;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Services\PlanLimitService;
use App\Services\TenantManager;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(
        private TenantManager $tenantManager,
        private PlanLimitService $planLimitService,
    ) {}

    public function __invoke(): Response
    {
        $manufacturer = $this->tenantManager->get();
        $activePlan = $this->planLimitService->activePlan($manufacturer);
        $orders = $manufacturer->orders();

        $grossRevenue = OrderItem::query()
            ->whereHas('order', fn ($query) => $query
                ->where('manufacturer_id', $manufacturer->id)
                ->where('status', '!=', OrderStatus::Cancelled->value))
            ->selectRaw('COALESCE(SUM(unit_price * quantity), 0) as aggregate')
            ->value('aggregate');

        $recentOrders = $manufacturer->orders()
            ->with(['items', 'salesRep:id,name'])
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn (Order $order) => [
                'id' => $order->id,
                'customer_name' => $order->customer_name,
                'status' => $order->status->value,
                'status_label' => $order->status->label(),
                'total_items' => $order->totalItems(),
                'total_amount' => $order->totalAmount(),
                'sales_rep_name' => $order->salesRep?->name,
                'created_at' => $order->created_at->toISOString(),
            ]);

        return Inertia::render('dashboard', [
            'manufacturer' => [
                'name' => $manufacturer->name,
                'plan_name' => $activePlan?->name,
            ],
            'stats' => [
                'orders_total' => (clone $orders)->count(),
                'orders_this_month' => (clone $orders)
                    ->whereBetween('created_at', [now()->startOfMonth(), now()->endOfMonth()])
                    ->count(),
                'new_orders' => (clone $orders)->where('status', OrderStatus::New->value)->count(),
                'customers' => $manufacturer->customers()->count(),
                'active_products' => $manufacturer->products()->where('is_active', true)->count(),
                'catalog_visits_30_days' => $manufacturer->catalogVisits()
                    ->where('visited_at', '>=', now()->subDays(30))
                    ->count(),
                'gross_revenue' => (float) $grossRevenue,
            ],
            'recentOrders' => $recentOrders,
        ]);
    }
}
