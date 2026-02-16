<?php

namespace App\Http\Controllers\Manufacturer;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateOrderStatusRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\OrderService;
use App\Services\TenantManager;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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

        $query = Order::where('manufacturer_id', $manufacturer->id)
            ->with(['items', 'salesRep'])
            ->latest();

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('customer_name', 'like', "%{$search}%")
                    ->orWhere('customer_phone', 'like', "%{$search}%")
                    ->orWhere('customer_email', 'like', "%{$search}%")
                    ->orWhere('id', $search);
            });
        }

        $orders = $query->paginate(15)->withQueryString();

        return Inertia::render('manufacturer/orders/index', [
            'orders' => OrderResource::collection($orders),
            'filters' => [
                'status' => $request->status ?? '',
                'search' => $request->search ?? '',
            ],
            'statuses' => collect(OrderStatus::cases())->map(fn (OrderStatus $s) => [
                'value' => $s->value,
                'label' => $s->label(),
            ]),
        ]);
    }

    public function show(Request $request, Order $order): Response
    {
        $this->authorize('view', $order);

        $order->load(['items', 'salesRep', 'statusHistory.changedBy']);

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
            ->with('success', "Pedido atualizado para \"{$newStatus->label()}\".");
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
