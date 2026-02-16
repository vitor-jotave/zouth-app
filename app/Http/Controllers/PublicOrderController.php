<?php

namespace App\Http\Controllers;

use App\Enums\UserType;
use App\Http\Requests\StorePublicOrderRequest;
use App\Http\Resources\OrderItemResource;
use App\Http\Resources\OrderStatusHistoryResource;
use App\Models\CatalogSetting;
use App\Models\ManufacturerAffiliation;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PublicOrderController extends Controller
{
    public function __construct(
        private OrderService $orderService,
    ) {}

    public function store(StorePublicOrderRequest $request, CatalogSetting $catalogSetting): RedirectResponse
    {
        $data = $request->validated();
        $data['manufacturer_id'] = $catalogSetting->manufacturer_id;

        // Resolve sales rep from tracking ref
        $ref = $request->query('ref');

        if ($ref) {
            $data['tracking_ref'] = $ref;
            $salesRep = ManufacturerAffiliation::query()
                ->where('manufacturer_id', $catalogSetting->manufacturer_id)
                ->where('status', 'active')
                ->whereHas('user', fn ($q) => $q->where('user_type', UserType::SalesRep->value))
                ->with('user')
                ->get()
                ->first(fn ($aff) => $aff->user->id == $ref || str_contains(strtolower($aff->user->name), strtolower($ref)));

            if ($salesRep) {
                $data['sales_rep_id'] = $salesRep->user_id;
            }
        }

        // UTM params from request
        foreach (['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as $param) {
            $data[$param] = $request->query($param) ?? $request->input($param);
        }

        $order = $this->orderService->createPublicOrder($data);

        return redirect()
            ->route('public.order.show', $order->public_token)
            ->with('success', 'Pedido enviado com sucesso!');
    }

    public function show(Request $request, string $publicToken): Response
    {
        $order = Order::where('public_token', $publicToken)
            ->with(['items', 'statusHistory.changedBy', 'manufacturer'])
            ->firstOrFail();

        return Inertia::render('public/order-tracking', [
            'order' => [
                'public_token' => $order->public_token,
                'status' => $order->status->value,
                'status_label' => $order->status->label(),
                'customer_name' => $order->customer_name,
                'items' => OrderItemResource::collection($order->items)->resolve($request),
                'total_items' => $order->items->sum('quantity'),
                'status_history' => OrderStatusHistoryResource::collection($order->statusHistory)->resolve($request),
                'created_at' => $order->created_at?->toISOString(),
            ],
            'manufacturer' => [
                'name' => $order->manufacturer->name,
            ],
        ]);
    }
}
