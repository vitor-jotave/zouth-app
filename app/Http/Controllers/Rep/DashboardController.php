<?php

namespace App\Http\Controllers\Rep;

use App\Enums\OrderStatus;
use App\Enums\OrderType;
use App\Http\Controllers\Controller;
use App\Models\Manufacturer;
use App\Models\ManufacturerAffiliation;
use App\Models\Order;
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

        $standardOrders = (clone $orders)->where('order_type', OrderType::Standard);
        $today = now()->startOfDay();
        $start = $today->copy()->subDays(29);
        $previousStart = $start->copy()->subDays(30);
        $end = $today->copy()->addDay();
        $daily = [];
        $statusCounts = array_fill_keys(array_column(OrderStatus::cases(), 'value'), 0);
        $netSales = 0;

        foreach ((clone $standardOrders)->with('items:id,order_id,unit_price,quantity')->lazyById() as $order) {
            $date = $order->created_at;

            if ($date >= $start && $date < $end) {
                $statusCounts[$order->status->value]++;
            }

            if ($order->status === OrderStatus::Cancelled) {
                continue;
            }

            $total = $order->totalCents();
            $netSales += $total;

            if ($date >= $previousStart && $date < $end) {
                $key = $date->toDateString();
                $daily[$key] ??= ['revenue_cents' => 0, 'orders' => 0];
                $daily[$key]['revenue_cents'] += $total;
                $daily[$key]['orders']++;
            }
        }

        $series = collect(range(0, 29))->map(function (int $offset) use ($start, $previousStart, $daily): array {
            $day = $start->copy()->addDays($offset);
            $date = $day->toDateString();
            $previousDate = $previousStart->copy()->addDays($offset)->toDateString();

            return [
                'date' => $date,
                'label' => $day->format('d/m'),
                'revenue_cents' => $daily[$date]['revenue_cents'] ?? 0,
                'orders' => $daily[$date]['orders'] ?? 0,
                'previous_revenue_cents' => $daily[$previousDate]['revenue_cents'] ?? 0,
                'previous_orders' => $daily[$previousDate]['orders'] ?? 0,
            ];
        });

        $affiliatedManufacturerIds = (clone $affiliations)->pluck('manufacturer_id');

        return Inertia::render('rep/dashboard', [
            'activity' => [
                'series' => $series,
                'statuses' => array_map(fn (OrderStatus $status): array => [
                    'value' => $status->value,
                    'label' => $status->label(),
                    'count' => $statusCounts[$status->value],
                ], OrderStatus::cases()),
            ],
            'stats' => [
                'active_affiliations' => (clone $affiliations)->where('status', 'active')->count(),
                'pending_affiliations' => (clone $affiliations)->where('status', 'pending')->count(),
                'orders_total' => (clone $standardOrders)->count(),
                'quotes_total' => (clone $orders)->where('order_type', OrderType::Quote)->count(),
                'orders_this_month' => (clone $standardOrders)
                    ->whereBetween('created_at', [now()->startOfMonth(), now()->endOfMonth()])
                    ->count(),
                'net_sales' => $netSales / 100,
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
