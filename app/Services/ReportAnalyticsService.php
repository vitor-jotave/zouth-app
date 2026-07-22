<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Enums\ProductMediaType;
use App\Models\CatalogVisit;
use App\Models\Manufacturer;
use App\Models\ManufacturerAffiliation;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;

class ReportAnalyticsService
{
    private const BUSINESS_TIMEZONE = 'America/Sao_Paulo';

    /**
     * @return array{key: string, start: CarbonImmutable, end: CarbonImmutable, previous_start: CarbonImmutable, previous_end: CarbonImmutable, label: string, comparison_label: string}
     */
    public function resolvePeriod(string $key, ?string $customStart = null, ?string $customEnd = null): array
    {
        $today = CarbonImmutable::now(self::BUSINESS_TIMEZONE)->startOfDay();

        [$start, $end, $label] = match ($key) {
            '7_days' => [$today->subDays(6), $today->endOfDay(), 'Últimos 7 dias'],
            '90_days' => [$today->subDays(89), $today->endOfDay(), 'Últimos 90 dias'],
            'current_month' => [$today->startOfMonth(), $today->endOfDay(), 'Este mês'],
            'current_year' => [$today->startOfYear(), $today->endOfDay(), 'Este ano'],
            'custom' => [
                CarbonImmutable::parse($customStart, self::BUSINESS_TIMEZONE)->startOfDay(),
                CarbonImmutable::parse($customEnd, self::BUSINESS_TIMEZONE)->endOfDay(),
                CarbonImmutable::parse($customStart, self::BUSINESS_TIMEZONE)->translatedFormat('d M').' — '.CarbonImmutable::parse($customEnd, self::BUSINESS_TIMEZONE)->translatedFormat('d M Y'),
            ],
            default => [$today->subDays(29), $today->endOfDay(), 'Últimos 30 dias'],
        };

        $days = $start->startOfDay()->diffInDays($end->startOfDay()) + 1;
        $previousEnd = $start->subSecond();
        $previousStart = $previousEnd->startOfDay()->subDays($days - 1);

        return [
            'key' => $key,
            'start' => $start,
            'end' => $end,
            'previous_start' => $previousStart,
            'previous_end' => $previousEnd,
            'label' => $label,
            'comparison_label' => 'vs. período anterior',
        ];
    }

    /**
     * @param  array{key: string, start: CarbonImmutable, end: CarbonImmutable, previous_start: CarbonImmutable, previous_end: CarbonImmutable, label: string, comparison_label: string}  $period
     * @return array<string, mixed>
     */
    public function build(Manufacturer $manufacturer, array $period): array
    {
        $currentOrders = $this->ordersFor($manufacturer, $period['start'], $period['end']);
        $previousOrders = $this->ordersFor($manufacturer, $period['previous_start'], $period['previous_end']);
        $commercialOrders = $currentOrders->reject(fn (Order $order): bool => $order->status === OrderStatus::Cancelled)->values();
        $previousCommercialOrders = $previousOrders->reject(fn (Order $order): bool => $order->status === OrderStatus::Cancelled)->values();
        $currentVisits = $this->visitsFor($manufacturer, $period['start'], $period['end']);
        $previousVisits = $this->visitsFor($manufacturer, $period['previous_start'], $period['previous_end']);
        $products = $this->productsFor($manufacturer);
        $stockByProduct = $products->mapWithKeys(fn (Product $product): array => [
            $product->id => $this->stockFor($product),
        ]);

        $summary = $this->summary($commercialOrders, $previousCommercialOrders, $currentVisits, $previousVisits);
        $topProducts = $this->topProducts($commercialOrders, $products, $stockByProduct, $period);
        $collection = $this->collectionReport($commercialOrders, $products, $stockByProduct, $topProducts);
        $customers = $this->customerReport($manufacturer, $commercialOrders, $period['end']);
        $representatives = $this->representativeReport($manufacturer, $commercialOrders);
        $catalog = $this->catalogReport($commercialOrders, $previousCommercialOrders, $currentVisits, $previousVisits);
        $operations = $this->operationsReport($currentOrders);

        return [
            'period' => [
                'key' => $period['key'],
                'start' => $period['start']->toDateString(),
                'end' => $period['end']->toDateString(),
                'label' => $period['label'],
                'comparison_label' => $period['comparison_label'],
            ],
            'summary' => $summary,
            'series' => $this->series($commercialOrders, $previousCommercialOrders, $period),
            'insights' => $this->insights($summary, $collection, $customers, $representatives),
            'top_products' => $topProducts->take(8)->values(),
            'collection' => $collection,
            'customers' => $customers,
            'representatives' => $representatives,
            'catalog' => $catalog,
            'operations' => $operations,
        ];
    }

    /** @return Collection<int, Order> */
    private function ordersFor(Manufacturer $manufacturer, CarbonImmutable $start, CarbonImmutable $end): Collection
    {
        return Order::query()
            ->where('manufacturer_id', $manufacturer->id)
            ->whereBetween('created_at', [$start->utc(), $end->utc()])
            ->with([
                'items.product.category',
                'items.product.media' => fn ($query) => $query
                    ->where('type', ProductMediaType::Image->value)
                    ->orderBy('sort_order'),
                'salesRep:id,name',
                'statusHistory',
            ])
            ->orderBy('created_at')
            ->get();
    }

    /** @return Collection<int, CatalogVisit> */
    private function visitsFor(Manufacturer $manufacturer, CarbonImmutable $start, CarbonImmutable $end): Collection
    {
        return CatalogVisit::query()
            ->where('manufacturer_id', $manufacturer->id)
            ->whereBetween('visited_at', [$start->utc(), $end->utc()])
            ->get();
    }

    /** @return Collection<int, Product> */
    private function productsFor(Manufacturer $manufacturer): Collection
    {
        return Product::query()
            ->where('manufacturer_id', $manufacturer->id)
            ->with([
                'category:id,name',
                'media' => fn ($query) => $query
                    ->where('type', ProductMediaType::Image->value)
                    ->orderBy('sort_order'),
                'productVariations:id,product_id',
                'variantStocks:id,product_id,quantity',
                'comboItems.componentVariantStock:id,quantity',
                'comboItems.componentProduct.productVariations:id,product_id',
                'comboItems.componentProduct.variantStocks:id,product_id,quantity',
            ])
            ->orderBy('name')
            ->get();
    }

    private function stockFor(Product $product): int
    {
        if ($product->isCombo()) {
            if ($product->comboItems->isEmpty()) {
                return 0;
            }

            return (int) $product->comboItems->map(function ($item): int {
                $component = $item->componentProduct;
                $available = $item->componentVariantStock?->quantity;

                if ($available === null && $component) {
                    $available = $component->productVariations->isNotEmpty()
                        ? (int) $component->variantStocks->sum('quantity')
                        : (int) $component->base_quantity;
                }

                return intdiv((int) $available, max(1, (int) $item->quantity));
            })->min();
        }

        if ($product->productVariations->isNotEmpty()) {
            return (int) $product->variantStocks->sum('quantity');
        }

        return (int) $product->base_quantity;
    }

    /**
     * @param  Collection<int, Order>  $orders
     * @param  Collection<int, Order>  $previousOrders
     * @param  Collection<int, CatalogVisit>  $visits
     * @param  Collection<int, CatalogVisit>  $previousVisits
     * @return array<string, int|float|null>
     */
    private function summary(Collection $orders, Collection $previousOrders, Collection $visits, Collection $previousVisits): array
    {
        $revenue = (int) $orders->sum(fn (Order $order): int => $order->totalCents());
        $previousRevenue = (int) $previousOrders->sum(fn (Order $order): int => $order->totalCents());
        $averageOrder = $orders->isEmpty() ? 0 : (int) round($revenue / $orders->count());
        $previousAverageOrder = $previousOrders->isEmpty() ? 0 : (int) round($previousRevenue / $previousOrders->count());
        $conversion = $visits->isEmpty() ? 0.0 : round($orders->count() / $visits->count() * 100, 1);
        $previousConversion = $previousVisits->isEmpty() ? 0.0 : round($previousOrders->count() / $previousVisits->count() * 100, 1);

        return [
            'net_revenue_cents' => $revenue,
            'net_revenue_change_percent' => $this->changePercent($revenue, $previousRevenue),
            'orders_count' => $orders->count(),
            'orders_change_percent' => $this->changePercent($orders->count(), $previousOrders->count()),
            'average_order_value_cents' => $averageOrder,
            'average_order_value_change_percent' => $this->changePercent($averageOrder, $previousAverageOrder),
            'conversion_rate' => $conversion,
            'conversion_change_points' => round($conversion - $previousConversion, 1),
            'units_sold' => (int) $orders->flatMap->items->sum('quantity'),
            'discount_cents' => (int) $orders->sum(fn (Order $order): int => $order->discountCents()),
        ];
    }

    /**
     * @param  Collection<int, Order>  $orders
     * @param  Collection<int, Product>  $products
     * @param  Collection<int, int>  $stockByProduct
     * @param  array<string, mixed>  $period
     * @return Collection<int, array<string, mixed>>
     */
    private function topProducts(Collection $orders, Collection $products, Collection $stockByProduct, array $period): Collection
    {
        $productsById = $products->keyBy('id');
        $items = $orders->flatMap(fn (Order $order): Collection => $order->items->map(fn (OrderItem $item): array => [
            'item' => $item,
            'order' => $order,
            'key' => $item->product_id ? 'product:'.$item->product_id : 'snapshot:'.mb_strtolower($item->product_sku ?: $item->product_name),
        ]));

        return $items->groupBy('key')->map(function (Collection $entries) use ($productsById, $stockByProduct, $period): array {
            /** @var OrderItem $first */
            $first = $entries->first()['item'];
            $product = $first->product_id ? $productsById->get($first->product_id) : null;
            $stock = $product ? (int) $stockByProduct->get($product->id, 0) : null;
            $media = $product?->media->first();
            $revenue = (int) round($entries->sum(fn (array $entry): float => (float) ($entry['item']->unit_price ?? 0) * $entry['item']->quantity * 100));

            return [
                'id' => $product?->id,
                'name' => $product?->name ?? $first->product_name,
                'sku' => $product?->sku ?? $first->product_sku,
                'category' => $product?->category?->name ?? 'Sem categoria',
                'image_url' => $media ? Storage::disk('s3')->url($media->thumbnail_path ?: $media->path) : null,
                'units' => (int) $entries->sum(fn (array $entry): int => $entry['item']->quantity),
                'revenue_cents' => $revenue,
                'stock' => $stock,
                'stock_status' => $stock === null ? 'unknown' : ($stock === 0 ? 'out' : ($stock <= 10 ? 'low' : 'healthy')),
                'trend' => $this->productTrend($entries, $period['start'], $period['end']),
            ];
        })->sortByDesc('revenue_cents')->values();
    }

    /**
     * @param  Collection<int, array{item: OrderItem, order: Order, key: string}>  $entries
     * @return list<int>
     */
    private function productTrend(Collection $entries, CarbonImmutable $start, CarbonImmutable $end): array
    {
        $totalDays = max(1, $start->startOfDay()->diffInDays($end->startOfDay()) + 1);

        return collect(range(0, 6))->map(function (int $bucket) use ($entries, $start, $totalDays): int {
            $bucketStart = $start->startOfDay()->addDays((int) floor($bucket * $totalDays / 7));
            $bucketEnd = $start->startOfDay()->addDays((int) floor(($bucket + 1) * $totalDays / 7))->subSecond();

            return (int) $entries->filter(fn (array $entry): bool => $entry['order']->created_at->copy()
                ->setTimezone(self::BUSINESS_TIMEZONE)
                ->between($bucketStart, $bucketEnd))
                ->sum(fn (array $entry): int => $entry['item']->quantity);
        })->all();
    }

    /**
     * @param  Collection<int, Order>  $orders
     * @param  Collection<int, Product>  $products
     * @param  Collection<int, int>  $stockByProduct
     * @param  Collection<int, array<string, mixed>>  $topProducts
     * @return array<string, mixed>
     */
    private function collectionReport(Collection $orders, Collection $products, Collection $stockByProduct, Collection $topProducts): array
    {
        $categories = $topProducts->groupBy('category')->map(fn (Collection $group, string $name): array => [
            'name' => $name,
            'revenue_cents' => (int) $group->sum('revenue_cents'),
            'units' => (int) $group->sum('units'),
        ])->sortByDesc('revenue_cents')->values();

        $days = max(1, $orders->first()?->created_at?->startOfDay()->diffInDays($orders->last()?->created_at?->startOfDay()) + 1);
        $inventoryRisk = $topProducts->filter(function (array $product) use ($days): bool {
            if ($product['stock'] === null || $product['units'] === 0) {
                return $product['stock_status'] === 'out';
            }

            return $product['stock'] / ($product['units'] / $days) <= 14;
        })->take(5)->values();

        return [
            'active_products' => $products->where('is_active', true)->count(),
            'units_sold' => (int) $orders->flatMap->items->sum('quantity'),
            'stock_units' => (int) $stockByProduct->sum(),
            'out_of_stock' => $stockByProduct->filter(fn (int $stock): bool => $stock === 0)->count(),
            'low_stock' => $stockByProduct->filter(fn (int $stock): bool => $stock > 0 && $stock <= 10)->count(),
            'categories' => $categories,
            'inventory_risk' => $inventoryRisk,
        ];
    }

    /**
     * @param  Collection<int, Order>  $orders
     * @return array<string, mixed>
     */
    private function customerReport(Manufacturer $manufacturer, Collection $orders, CarbonImmutable $periodEnd): array
    {
        $allOrders = Order::query()
            ->where('manufacturer_id', $manufacturer->id)
            ->where('status', '!=', OrderStatus::Cancelled->value)
            ->where('created_at', '<=', $periodEnd->utc())
            ->with('items')
            ->orderBy('created_at')
            ->get();
        $currentByCustomer = $orders->groupBy(fn (Order $order): string => $this->customerKey($order));
        $allByCustomer = $allOrders->groupBy(fn (Order $order): string => $this->customerKey($order));
        $newBuyers = $currentByCustomer->filter(function (Collection $customerOrders, string $key) use ($allByCustomer): bool {
            return $allByCustomer->get($key)?->first()?->is($customerOrders->first()) ?? false;
        })->count();
        $repeatBuyers = $currentByCustomer->filter(fn (Collection $customerOrders, string $key): bool => $allByCustomer->get($key, collect())->count() >= 2)->count();
        $reorderIntervals = $allByCustomer->flatMap(function (Collection $customerOrders): Collection {
            return $customerOrders->values()->slice(1)->map(function (Order $order, int $index) use ($customerOrders): int {
                return $customerOrders->values()->get($index)->created_at->diffInDays($order->created_at);
            });
        });
        $top = $currentByCustomer->map(function (Collection $customerOrders): array {
            /** @var Order $lastOrder */
            $lastOrder = $customerOrders->last();

            return [
                'name' => $lastOrder->customer_name,
                'state' => $lastOrder->customer_state,
                'city' => $lastOrder->customer_city,
                'orders' => $customerOrders->count(),
                'revenue_cents' => (int) $customerOrders->sum(fn (Order $order): int => $order->totalCents()),
                'last_order_at' => $lastOrder->created_at->toIso8601String(),
            ];
        })->sortByDesc('revenue_cents')->take(8)->values();
        $regions = $orders->groupBy(fn (Order $order): string => $order->customer_state ?: 'Não informado')
            ->map(fn (Collection $stateOrders, string $state): array => [
                'state' => $state,
                'orders' => $stateOrders->count(),
                'revenue_cents' => (int) $stateOrders->sum(fn (Order $order): int => $order->totalCents()),
            ])->sortByDesc('revenue_cents')->values();
        $attentionSince = $periodEnd->subDays(60);
        $inactive = $allByCustomer->filter(fn (Collection $customerOrders): bool => $customerOrders->last()->created_at->lt($attentionSince))->count();

        return [
            'buyers_count' => $currentByCustomer->count(),
            'new_buyers' => $newBuyers,
            'returning_buyers' => max(0, $currentByCustomer->count() - $newBuyers),
            'repeat_rate' => $currentByCustomer->isEmpty() ? 0.0 : round($repeatBuyers / $currentByCustomer->count() * 100, 1),
            'average_reorder_days' => $reorderIntervals->isEmpty() ? null : (int) round($reorderIntervals->average()),
            'inactive_count' => $inactive,
            'top' => $top,
            'regions' => $regions,
        ];
    }

    /** @param Collection<int, Order> $orders */
    private function representativeReport(Manufacturer $manufacturer, Collection $orders): array
    {
        $activeCount = ManufacturerAffiliation::query()
            ->where('manufacturer_id', $manufacturer->id)
            ->where('status', 'active')
            ->count();
        $attributed = $orders->whereNotNull('sales_rep_id');
        $ranking = $attributed->groupBy('sales_rep_id')->map(function (Collection $repOrders): array {
            /** @var Order $first */
            $first = $repOrders->first();

            return [
                'id' => $first->sales_rep_id,
                'name' => $first->salesRep?->name ?? 'Representante',
                'orders' => $repOrders->count(),
                'revenue_cents' => (int) $repOrders->sum(fn (Order $order): int => $order->totalCents()),
                'average_order_value_cents' => (int) round($repOrders->average(fn (Order $order): int => $order->totalCents())),
            ];
        })->sortByDesc('revenue_cents')->values();

        return [
            'active_count' => $activeCount,
            'attributed_orders' => $attributed->count(),
            'attributed_revenue_cents' => (int) $attributed->sum(fn (Order $order): int => $order->totalCents()),
            'share_percent' => $orders->isEmpty() ? 0.0 : round($attributed->count() / $orders->count() * 100, 1),
            'unassigned_orders' => $orders->whereNull('sales_rep_id')->count(),
            'ranking' => $ranking,
        ];
    }

    /**
     * @param  Collection<int, Order>  $orders
     * @param  Collection<int, Order>  $previousOrders
     * @param  Collection<int, CatalogVisit>  $visits
     * @param  Collection<int, CatalogVisit>  $previousVisits
     * @return array<string, mixed>
     */
    private function catalogReport(Collection $orders, Collection $previousOrders, Collection $visits, Collection $previousVisits): array
    {
        $sources = $visits->groupBy(fn (CatalogVisit $visit): string => $this->sourceLabel($visit->utm_source, $visit->referer))
            ->map(function (Collection $sourceVisits, string $source) use ($orders): array {
                $sourceOrders = $orders->filter(fn (Order $order): bool => $this->sourceLabel($order->utm_source, null) === $source);

                return [
                    'source' => $source,
                    'visits' => $sourceVisits->count(),
                    'orders' => $sourceOrders->count(),
                    'revenue_cents' => (int) $sourceOrders->sum(fn (Order $order): int => $order->totalCents()),
                    'conversion_rate' => $sourceVisits->isEmpty() ? 0.0 : round($sourceOrders->count() / $sourceVisits->count() * 100, 1),
                ];
            })->sortByDesc('visits')->values();

        return [
            'visits' => $visits->count(),
            'visits_change_percent' => $this->changePercent($visits->count(), $previousVisits->count()),
            'orders' => $orders->count(),
            'conversion_rate' => $visits->isEmpty() ? 0.0 : round($orders->count() / $visits->count() * 100, 1),
            'previous_conversion_rate' => $previousVisits->isEmpty() ? 0.0 : round($previousOrders->count() / $previousVisits->count() * 100, 1),
            'sources' => $sources,
        ];
    }

    /** @param Collection<int, Order> $orders */
    private function operationsReport(Collection $orders): array
    {
        $statusDistribution = collect(OrderStatus::cases())->map(fn (OrderStatus $status): array => [
            'status' => $status->value,
            'label' => $status->label(),
            'count' => $orders->where('status', $status)->count(),
        ])->all();
        $confirmationHours = $this->transitionHours($orders, OrderStatus::Confirmed);
        $shippingHours = $this->transitionHours($orders, OrderStatus::Shipped);
        $openStatuses = [OrderStatus::New, OrderStatus::Confirmed, OrderStatus::Preparing];

        return [
            'status_distribution' => $statusDistribution,
            'cancellation_rate' => $orders->isEmpty() ? 0.0 : round($orders->where('status', OrderStatus::Cancelled)->count() / $orders->count() * 100, 1),
            'average_confirmation_hours' => $confirmationHours,
            'average_shipping_hours' => $shippingHours,
            'attention_orders' => $orders->filter(fn (Order $order): bool => in_array($order->status, $openStatuses, true) && $order->created_at->lt(now()->subDays(7)))->count(),
        ];
    }

    /**
     * @param  Collection<int, Order>  $orders
     * @param  Collection<int, Order>  $previousOrders
     * @param  array<string, mixed>  $period
     * @return list<array<string, int|string>>
     */
    private function series(Collection $orders, Collection $previousOrders, array $period): array
    {
        $days = $period['start']->startOfDay()->diffInDays($period['end']->startOfDay()) + 1;

        return collect(range(0, $days - 1))->map(function (int $offset) use ($orders, $previousOrders, $period): array {
            $date = $period['start']->startOfDay()->addDays($offset);
            $previousDate = $period['previous_start']->startOfDay()->addDays($offset);
            $dayOrders = $orders->filter(fn (Order $order): bool => $order->created_at->copy()
                ->setTimezone(self::BUSINESS_TIMEZONE)
                ->isSameDay($date));
            $previousDayOrders = $previousOrders->filter(fn (Order $order): bool => $order->created_at->copy()
                ->setTimezone(self::BUSINESS_TIMEZONE)
                ->isSameDay($previousDate));

            return [
                'date' => $date->toDateString(),
                'label' => $date->translatedFormat('d M'),
                'revenue_cents' => (int) $dayOrders->sum(fn (Order $order): int => $order->totalCents()),
                'orders' => $dayOrders->count(),
                'previous_revenue_cents' => (int) $previousDayOrders->sum(fn (Order $order): int => $order->totalCents()),
                'previous_orders' => $previousDayOrders->count(),
            ];
        })->all();
    }

    /**
     * @param  array<string, int|float|null>  $summary
     * @param  array<string, mixed>  $collection
     * @param  array<string, mixed>  $customers
     * @param  array<string, mixed>  $representatives
     * @return list<array{title: string, description: string, section: string}>
     */
    private function insights(array $summary, array $collection, array $customers, array $representatives): array
    {
        $topCategory = $collection['categories']->first();
        $totalRevenue = max(1, (int) $summary['net_revenue_cents']);
        $categoryShare = $topCategory ? round($topCategory['revenue_cents'] / $totalRevenue * 100) : 0;

        return array_values(array_filter([
            $topCategory ? [
                'title' => $topCategory['name'].' puxa a coleção',
                'description' => "A categoria responde por {$categoryShare}% do faturamento deste período.",
                'section' => 'collection',
            ] : null,
            [
                'title' => $customers['repeat_rate'] > 0 ? 'A recompra já aparece' : 'A recompra ainda pode crescer',
                'description' => $customers['repeat_rate'] > 0
                    ? $customers['repeat_rate'].'% dos lojistas do período já compraram mais de uma vez.'
                    : 'Ainda não há lojistas recorrentes no período selecionado.',
                'section' => 'customers',
            ],
            [
                'title' => $representatives['share_percent'] > 0 ? 'A rede está gerando movimento' : 'Há espaço para ativar a rede',
                'description' => $representatives['share_percent'].'% dos pedidos do período foram atribuídos a representantes.',
                'section' => 'representatives',
            ],
        ]));
    }

    private function customerKey(Order $order): string
    {
        if ($order->customer_id) {
            return 'customer:'.$order->customer_id;
        }

        return 'contact:'.mb_strtolower(trim($order->customer_email ?: $order->customer_phone ?: $order->customer_name));
    }

    private function sourceLabel(?string $utmSource, ?string $referer): string
    {
        if ($utmSource) {
            return mb_convert_case(str_replace(['_', '-'], ' ', trim($utmSource)), MB_CASE_TITLE, 'UTF-8');
        }

        if ($referer) {
            $host = parse_url($referer, PHP_URL_HOST);

            if (is_string($host) && $host !== '') {
                return preg_replace('/^www\./', '', $host) ?: 'Referência';
            }
        }

        return 'Direto';
    }

    /** @param Collection<int, Order> $orders */
    private function transitionHours(Collection $orders, OrderStatus $status): ?float
    {
        $hours = $orders->map(function (Order $order) use ($status): ?float {
            $transition = $order->statusHistory->first(fn ($history): bool => $history->to_status === $status);

            return $transition ? round($order->created_at->diffInMinutes($transition->created_at) / 60, 1) : null;
        })->filter(fn (?float $hours): bool => $hours !== null);

        return $hours->isEmpty() ? null : round((float) $hours->average(), 1);
    }

    private function changePercent(int|float $current, int|float $previous): ?float
    {
        if ((float) $previous === 0.0) {
            return (float) $current === 0.0 ? 0.0 : null;
        }

        return round(($current - $previous) / abs($previous) * 100, 1);
    }
}
