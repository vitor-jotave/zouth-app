<?php

declare(strict_types=1);

namespace App\Http\Controllers\Rep;

use App\Enums\OrderStatus;
use App\Enums\OrderType;
use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Manufacturer;
use App\Models\Order;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller
{
    public function index(Request $request): Response
    {
        $repId = $request->user()->id;
        $brand = max(0, $request->integer('brand'));
        $search = mb_substr(trim($request->string('search')->toString()), 0, 100);
        $owned = fn (Builder $orders): Builder => $orders->where('sales_rep_id', $repId)
            ->whereColumn('orders.manufacturer_id', 'customers.manufacturer_id');

        $portfolio = Customer::query()->whereHas('orders', $owned);
        $customers = (clone $portfolio)->select(['id', 'manufacturer_id', 'name'])
            ->with('manufacturer:id,name')
            ->withMax(['orders as last_order_at' => fn (Builder $orders): Builder => $owned($orders)->where('order_type', OrderType::Standard)], 'created_at')
            ->when($brand, fn (Builder $query) => $query->where('manufacturer_id', $brand))
            ->when($search !== '', fn (Builder $query) => $query->whereLike('name', "%{$search}%"))
            ->orderBy('name')->orderBy('id')->paginate(15)->withQueryString();

        $metrics = [];
        foreach ($this->ownedOrders($request)->whereIn('customer_id', $customers->getCollection()->modelKeys())
            ->whereHas('customer', fn (Builder $query) => $query->whereColumn('customers.manufacturer_id', 'orders.manufacturer_id'))
            ->with('items:id,order_id,unit_price,quantity')->lazyById() as $order) {
            $id = $order->customer_id;
            $metrics[$id] ??= ['orders_count' => 0, 'quotes_count' => 0, 'net_cents' => 0];

            if ($order->order_type === OrderType::Quote) {
                $metrics[$id]['quotes_count']++;
            } else {
                $metrics[$id]['orders_count']++;
                if ($order->status !== OrderStatus::Cancelled) {
                    $metrics[$id]['net_cents'] += $order->totalCents();
                }
            }
        }

        return Inertia::render('rep/customers/index', [
            'customers' => $customers->through(fn (Customer $customer): array => [
                'id' => $customer->id,
                'name' => $customer->name,
                'brand' => $customer->manufacturer->name,
                'last_order_at' => $customer->last_order_at?->toISOString(),
            ] + ($metrics[$customer->id] ?? ['orders_count' => 0, 'quotes_count' => 0, 'net_cents' => 0])),
            'brands' => Manufacturer::query()->whereIn('id', $portfolio->select('manufacturer_id'))->orderBy('name')->get(['id', 'name']),
            'filters' => ['search' => $search, 'brand' => $brand],
        ]);
    }

    public function show(Request $request, Customer $customer): Response
    {
        $orders = $this->ownedOrders($request)->whereBelongsTo($customer)->where('manufacturer_id', $customer->manufacturer_id);
        abort_unless((clone $orders)->exists(), 404);
        $customer->load('manufacturer:id,name');

        $standardOrders = (clone $orders)->where('order_type', OrderType::Standard);
        $netCents = 0;
        foreach ((clone $standardOrders)->where('status', '!=', OrderStatus::Cancelled)
            ->with('items:id,order_id,unit_price,quantity')->lazyById() as $order) {
            $netCents += $order->totalCents();
        }

        return Inertia::render('rep/customers/show', [
            'customer' => ['id' => $customer->id, 'name' => $customer->name, 'brand' => $customer->manufacturer->name],
            'net_cents' => $netCents,
            'orders' => $this->history($standardOrders, 'orders_page'),
            'quotes' => $this->history($orders->where('order_type', OrderType::Quote), 'quotes_page'),
            'filters' => ['brand' => max(0, $request->integer('brand')), 'search' => mb_substr($request->string('search')->toString(), 0, 100), 'page' => max(1, $request->integer('portfolio_page'))],
        ]);
    }

    private function ownedOrders(Request $request): Builder
    {
        return Order::query()->where('sales_rep_id', $request->user()->id);
    }

    private function history(Builder $orders, string $pageName): \Illuminate\Pagination\LengthAwarePaginator
    {
        return $orders->with('items:id,order_id,unit_price,quantity')
            ->latest()->orderByDesc('id')->paginate(10, ['*'], $pageName)->withQueryString()
            ->through(fn (Order $order): array => [
                'id' => $order->id,
                'status' => $order->status->value,
                'status_label' => $order->statusLabel(),
                'created_at' => $order->created_at->toISOString(),
                'total_amount' => $order->order_type === OrderType::Quote ? null : $order->totalAmount(),
            ]);
    }
}
