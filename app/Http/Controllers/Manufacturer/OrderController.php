<?php

namespace App\Http\Controllers\Manufacturer;

use App\Enums\OrderStatus;
use App\Enums\OrderType;
use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateOrderStatusRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\OrderService;
use App\Services\TenantManager;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    public function __construct(
        private TenantManager $tenantManager,
        private OrderService $orderService,
    ) {}

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Order::class);

        $manufacturer = $this->tenantManager->get();
        $search = trim($request->string('search')->toString());
        $status = OrderStatus::tryFrom($request->string('status')->toString());
        $view = $request->string('view')->toString() === 'list' ? 'list' : 'board';

        $query = Order::query()
            ->where('manufacturer_id', $manufacturer->id)
            ->with(['items', 'salesRep'])
            ->latest();

        if ($status) {
            $query->where('status', $status);
        }

        $this->applySearch($query, $search);

        $orders = $query->paginate(15)->withQueryString();
        $boardStatuses = $status
            ? collect([$status])
            : collect(OrderStatus::cases())->reject(
                fn (OrderStatus $orderStatus): bool => $orderStatus === OrderStatus::Cancelled,
            );
        $statusCounts = Order::query()
            ->where('manufacturer_id', $manufacturer->id)
            ->selectRaw('status, COUNT(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');
        $totalAmount = $this->ordersTotal(
            $manufacturer->id,
            excludedStatus: OrderStatus::Cancelled,
        );
        $inProgressStatuses = [
            OrderStatus::New,
            OrderStatus::Confirmed,
            OrderStatus::Preparing,
            OrderStatus::Shipped,
        ];

        return Inertia::render('manufacturer/orders/index', [
            'orders' => OrderResource::collection($orders),
            'board_stages' => $this->boardStages(
                $request,
                $manufacturer->id,
                $boardStatuses,
                $search,
            ),
            'order_summary' => [
                'total_orders' => (int) $statusCounts->sum(),
                'in_progress' => collect($inProgressStatuses)->sum(
                    fn (OrderStatus $orderStatus): int => (int) ($statusCounts[$orderStatus->value] ?? 0),
                ),
                'total_amount' => number_format($totalAmount, 2, '.', ''),
                'awaiting_confirmation' => (int) ($statusCounts[OrderStatus::New->value] ?? 0),
            ],
            'filters' => [
                'status' => $status?->value ?? '',
                'search' => $search,
                'view' => $view,
            ],
            'statuses' => collect(OrderStatus::cases())->map(fn (OrderStatus $s) => [
                'value' => $s->value,
                'label' => $s->label(),
            ]),
        ]);
    }

    /**
     * @param  Collection<int, OrderStatus>  $statuses
     * @return Collection<int, array<string, mixed>>
     */
    private function boardStages(
        Request $request,
        int $manufacturerId,
        Collection $statuses,
        string $search,
    ): Collection {
        return $statuses->map(function (OrderStatus $status) use ($request, $manufacturerId, $search): array {
            $query = Order::query()
                ->where('manufacturer_id', $manufacturerId)
                ->where('status', $status)
                ->with(['items', 'salesRep'])
                ->latest();

            $this->applySearch($query, $search);

            $count = (clone $query)->count();
            $orders = $query->limit(12)->get();

            return [
                'value' => $status->value,
                'label' => $status->label(),
                'count' => $count,
                'total_amount' => number_format(
                    $this->ordersTotal($manufacturerId, $status, search: $search),
                    2,
                    '.',
                    '',
                ),
                'has_more' => $count > $orders->count(),
                'orders' => OrderResource::collection($orders)->resolve($request),
            ];
        })->values();
    }

    private function applySearch(Builder $query, string $search): void
    {
        if ($search === '') {
            return;
        }

        $query->where(function (Builder $query) use ($search): void {
            $query->where('customer_name', 'like', "%{$search}%")
                ->orWhere('customer_phone', 'like', "%{$search}%")
                ->orWhere('customer_email', 'like', "%{$search}%");

            if (ctype_digit($search)) {
                $query->orWhere('id', (int) $search);
            }
        });
    }

    private function ordersTotal(
        int $manufacturerId,
        ?OrderStatus $status = null,
        ?OrderStatus $excludedStatus = null,
        string $search = '',
    ): float {
        $query = Order::query()
            ->where('manufacturer_id', $manufacturerId)
            ->where('order_type', OrderType::Standard)
            ->with('items');

        if ($status) {
            $query->where('status', $status);
        }

        if ($excludedStatus) {
            $query->where('status', '!=', $excludedStatus);
        }

        $this->applySearch($query, $search);

        return round((float) $query->get()->sum(
            fn (Order $order): float => $order->totalAmount(),
        ), 2);
    }

    public function show(Request $request, Order $order): Response
    {
        $this->authorize('view', $order);

        $order->load([
            'items.product.media',
            'items.product.comboItems.componentProduct.media',
            'salesRep',
            'statusHistory.changedBy',
        ]);

        return Inertia::render('manufacturer/orders/show', [
            'order' => (new OrderResource($order))->resolve($request),
        ]);
    }

    public function updateStatus(UpdateOrderStatusRequest $request, Order $order): RedirectResponse
    {
        $newStatus = OrderStatus::from($request->validated('status'));

        $this->orderService->updateStatus($order, $newStatus, $request->user()->id);

        return redirect()
            ->back()
            ->with(
                'success',
                "{$order->order_type->label()} atualizado para \"{$order->statusLabel($newStatus)}\"."
            );
    }

    public function updateNotes(Request $request, Order $order): RedirectResponse
    {
        $this->authorize('updateStatus', $order);

        $validated = $request->validate([
            'internal_notes' => ['nullable', 'string', 'max:5000'],
        ]);

        $order->update($validated);

        return redirect()->back()->with('success', 'Notas atualizadas.');
    }
}
