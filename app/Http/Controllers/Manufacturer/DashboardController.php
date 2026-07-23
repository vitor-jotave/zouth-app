<?php

namespace App\Http\Controllers\Manufacturer;

use App\Enums\OrderStatus;
use App\Enums\OrderType;
use App\Enums\ProductMediaType;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductMedia;
use App\Services\PlanLimitService;
use App\Services\TenantManager;
use Illuminate\Support\Facades\Storage;
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
        $catalogSetting = $manufacturer->catalogSetting()->first();

        $catalogProducts = $manufacturer->products()
            ->where('is_active', true)
            ->with(['media' => fn ($query) => $query
                ->where('type', ProductMediaType::Image->value)])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->limit(3)
            ->get(['id', 'manufacturer_id', 'name', 'price_cents', 'sort_order'])
            ->map(function (Product $product): array {
                /** @var ProductMedia|null $primaryImage */
                $primaryImage = $product->media->first();

                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'price' => $product->price_cents !== null
                        ? $product->price_cents / 100
                        : null,
                    'image_url' => $primaryImage
                        ? Storage::disk('s3')->url($primaryImage->path)
                        : null,
                    'image_alt' => $primaryImage ? $product->name : null,
                ];
            });

        $grossRevenue = OrderItem::query()
            ->whereHas('order', fn ($query) => $query
                ->where('manufacturer_id', $manufacturer->id)
                ->where('order_type', OrderType::Standard)
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
                'status_label' => $order->statusLabel(),
                'order_type' => $order->order_type->value,
                'order_type_label' => $order->order_type->label(),
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
            'catalog' => [
                'public_link' => $catalogSetting?->public_link_active
                    ? route('public.catalog.show', ['token' => $catalogSetting->public_token])
                    : null,
                'is_public' => $catalogSetting?->public_link_active ?? false,
                'products' => $catalogProducts,
            ],
            'recentOrders' => $recentOrders,
        ]);
    }
}
