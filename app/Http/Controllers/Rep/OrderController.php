<?php

namespace App\Http\Controllers\Rep;

use App\Enums\OrderStatus;
use App\Enums\OrderType;
use App\Http\Controllers\Controller;
use App\Http\Resources\OrderItemResource;
use App\Http\Resources\OrderStatusHistoryResource;
use App\Models\Manufacturer;
use App\Models\Order;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    public function index(Request $request): Response
    {
        $owned = Order::query()->where('sales_rep_id', $request->user()->id);
        $brand = $request->integer('brand');
        $statusFilter = $request->string('status')->toString();
        $status = OrderStatus::tryFrom($statusFilter);
        $inProgressOnly = $statusFilter === 'in_progress';
        $inProgressStatuses = [OrderStatus::Confirmed, OrderStatus::Preparing, OrderStatus::Shipped];
        $days = $request->integer('days');
        $days = in_array($days, [30, 90], true) ? $days : 0;
        $view = $request->query('view') === 'list' ? 'list' : 'board';
        $search = mb_substr(trim($request->string('search')->toString()), 0, 100);
        $selection = (clone $owned)
            ->when($brand > 0, fn ($query) => $query->where('manufacturer_id', $brand))
            ->when($status, fn ($query) => $query->where('status', $status))
            ->when($inProgressOnly, fn ($query) => $query->whereIn('status', $inProgressStatuses)->where('order_type', OrderType::Standard))
            ->when($days, fn ($query) => $query->where('created_at', '>=', now()->subDays($days)))
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($query) use ($search): void {
                    $query->whereLike('customer_name', "%{$search}%")
                        ->orWhereHas('manufacturer', fn ($brand) => $brand->whereLike('name', "%{$search}%"));

                    $number = ltrim($search, '#0');
                    if (ctype_digit($number) && strlen($number) <= 18) {
                        $query->orWhere('id', $number);
                    }
                });
            });
        $orders = (clone $selection)->with(['items', 'manufacturer:id,name'])
            ->latest()->orderByDesc('id')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Order $order): array => $this->summary($order));

        $counts = array_fill_keys(array_column(OrderStatus::cases(), 'value'), 0);
        $netCents = 0;
        foreach ((clone $selection)->with('items:id,order_id,unit_price,quantity')->lazyById() as $order) {
            $counts[$order->status->value]++;
            if ($order->order_type === OrderType::Standard && $order->status !== OrderStatus::Cancelled) {
                $netCents += $order->totalCents();
            }
        }

        $stages = $view === 'board' ? collect(OrderStatus::cases())
            ->filter(fn (OrderStatus $stage): bool => $inProgressOnly ? in_array($stage, $inProgressStatuses, true) : ($status === null || $stage === $status))
            ->map(fn (OrderStatus $stage): array => [
                'value' => $stage->value,
                'label' => $stage->label(),
                'count' => $counts[$stage->value],
                'orders' => $counts[$stage->value] === 0 ? [] : (clone $selection)
                    ->where('status', $stage)->with(['items', 'manufacturer:id,name'])
                    ->latest()->orderByDesc('id')->limit(8)->get()
                    ->map(fn (Order $order): array => $this->summary($order))->all(),
            ])->values() : [];

        return Inertia::render('rep/orders/index', [
            'orders' => $orders,
            'stages' => $stages,
            'summary' => [
                'total' => $orders->total(),
                'new' => $counts[OrderStatus::New->value],
                'in_progress' => $counts[OrderStatus::Confirmed->value] + $counts[OrderStatus::Preparing->value] + $counts[OrderStatus::Shipped->value],
                'net_amount' => $netCents / 100,
            ],
            'brands' => Manufacturer::query()->whereIn('id', $owned->select('manufacturer_id'))->orderBy('name')->get(['id', 'name']),
            'statuses' => array_map(fn (OrderStatus $status): array => ['value' => $status->value, 'label' => $status->label()], OrderStatus::cases()),
            'filters' => ['brand' => $brand, 'status' => $inProgressOnly ? 'in_progress' : ($status?->value ?? ''), 'days' => $days, 'search' => $search, 'view' => $view],
        ]);
    }

    public function show(Request $request, Order $order): Response
    {
        abort_unless($order->sales_rep_id === $request->user()->id, 404);
        $order->load([
            'items.product.media',
            'items.product.comboItems.componentProduct.media',
            'manufacturer:id,name',
            'statusHistory',
        ]);

        return Inertia::render('rep/orders/show', [
            'order' => $this->summary($order) + [
                'items' => OrderItemResource::collection($order->items)->resolve($request),
                'status_history' => OrderStatusHistoryResource::collection($order->statusHistory)->resolve($request),
            ],
            'from_customer' => $order->customer_id !== null && $request->integer('from_customer') === $order->customer_id
                ? [
                    'id' => $order->customer_id,
                    'search' => mb_substr($request->string('search')->toString(), 0, 100),
                    'brand' => max(0, $request->integer('brand')),
                    'portfolio_page' => max(1, $request->integer('portfolio_page')),
                    'orders_page' => max(1, $request->integer('orders_page')),
                    'quotes_page' => max(1, $request->integer('quotes_page')),
                ]
                : null,
        ]);
    }

    /** @return array<string, mixed> */
    private function summary(Order $order): array
    {
        return [
            'id' => $order->id,
            'manufacturer_name' => $order->manufacturer->name,
            'customer_name' => $order->customer_name,
            'status' => $order->status->value,
            'status_label' => $order->statusLabel(),
            'order_type' => $order->order_type->value,
            'order_type_label' => $order->order_type->label(),
            'subtotal_amount' => $order->subtotalAmount(),
            'discount_amount' => $order->discountAmount(),
            'total_amount' => $order->totalAmount(),
            'total_items' => $order->totalItems(),
            'created_at' => $order->created_at->toISOString(),
        ];
    }
}
