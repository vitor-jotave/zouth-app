<?php

namespace App\Http\Controllers\Rep;

use App\Enums\OrderStatus;
use App\Enums\OrderType;
use App\Http\Controllers\Controller;
use App\Models\Manufacturer;
use App\Models\ManufacturerAffiliation;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display the sales rep dashboard.
     */
    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        $orders = Order::query()->where('sales_rep_id', $user->id);
        $affiliations = ManufacturerAffiliation::query()->where('user_id', $user->id);

        $grossSales = OrderItem::query()
            ->whereHas('order', fn ($query) => $query
                ->where('sales_rep_id', $user->id)
                ->where('order_type', OrderType::Standard)
                ->where('status', '!=', OrderStatus::Cancelled->value))
            ->selectRaw('COALESCE(SUM(unit_price * quantity), 0) as aggregate')
            ->value('aggregate');

        $affiliatedManufacturerIds = (clone $affiliations)->pluck('manufacturer_id');

        return Inertia::render('rep/dashboard', [
            'stats' => [
                'active_affiliations' => (clone $affiliations)->where('status', 'active')->count(),
                'pending_affiliations' => (clone $affiliations)->where('status', 'pending')->count(),
                'orders_total' => (clone $orders)->count(),
                'orders_this_month' => (clone $orders)
                    ->whereBetween('created_at', [now()->startOfMonth(), now()->endOfMonth()])
                    ->count(),
                'gross_sales' => (float) $grossSales,
                'available_manufacturers' => Manufacturer::query()
                    ->where('is_active', true)
                    ->whereNotIn('id', $affiliatedManufacturerIds)
                    ->count(),
            ],
            'recentOrders' => Order::query()
                ->where('sales_rep_id', $user->id)
                ->with(['items', 'manufacturer:id,name'])
                ->latest()
                ->limit(5)
                ->get()
                ->map(fn (Order $order) => [
                    'id' => $order->id,
                    'public_token' => $order->public_token,
                    'manufacturer_name' => $order->manufacturer->name,
                    'customer_name' => $order->customer_name,
                    'status' => $order->status->value,
                    'status_label' => $order->statusLabel(),
                    'order_type' => $order->order_type->value,
                    'order_type_label' => $order->order_type->label(),
                    'total_items' => $order->totalItems(),
                    'total_amount' => $order->totalAmount(),
                    'created_at' => $order->created_at->toISOString(),
                ]),
        ]);
    }
}
