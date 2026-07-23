<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Enums\OrderType;
use App\Models\Order;
use App\Models\OrderRule;
use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OrderService
{
    public function __construct(
        private CustomerService $customerService,
        private InventoryReservationService $inventoryReservationService,
        private OrderCartBuilder $orderCartBuilder,
        private OrderRuleEvaluator $orderRuleEvaluator,
    ) {}

    /**
     * @param  array{
     *     manufacturer_id: int,
     *     customer_name: string,
     *     customer_phone?: string|null,
     *     customer_email?: string|null,
     *     request_quote?: bool,
     *     customer_document_type?: string|null,
     *     customer_document?: string|null,
     *     customer_notes?: string|null,
     *     customer_zip_code?: string|null,
     *     customer_state?: string|null,
     *     customer_city?: string|null,
     *     customer_neighborhood?: string|null,
     *     customer_street?: string|null,
     *     customer_address_number?: string|null,
     *     customer_address_complement?: string|null,
     *     customer_address_reference?: string|null,
     *     tracking_ref?: string|null,
     *     sales_rep_id?: int|null,
     *     utm_source?: string|null,
     *     utm_medium?: string|null,
     *     utm_campaign?: string|null,
     *     utm_content?: string|null,
     *     utm_term?: string|null,
     *     items: array<int, array{product_id: int, quantity: int, size?: string|null, color?: string|null, selected_variations?: array<string, string>|null}>
     * }  $data
     */
    public function createPublicOrder(array $data): Order
    {
        return DB::transaction(function () use ($data) {
            $cart = $this->orderCartBuilder->build(
                $data['manufacturer_id'],
                $data['items'],
                lockForUpdate: true,
            );
            $requestedQuote = (bool) ($data['request_quote'] ?? false);
            $requiresQuote = $cart['requires_quote'];

            if ($requestedQuote !== $requiresQuote) {
                throw ValidationException::withMessages([
                    'items' => $requiresQuote
                        ? 'A disponibilidade mudou. Revise a seleção e envie como solicitação de orçamento.'
                        : 'Esta seleção está disponível para um pedido normal. Atualize o catálogo antes de continuar.',
                ]);
            }

            $rules = OrderRule::query()
                ->where('manufacturer_id', $data['manufacturer_id'])
                ->where('is_active', true)
                ->orderBy('created_at')
                ->orderBy('id')
                ->get();
            $pricing = $this->orderRuleEvaluator->evaluate($rules, $cart['items']);

            if (! $requiresQuote && $pricing['is_blocked']) {
                throw ValidationException::withMessages([
                    'order_rules' => $pricing['blocking_messages'],
                ]);
            }

            $customer = $requiresQuote
                ? null
                : $this->customerService->upsertFromOrderData($data);

            $order = Order::create([
                'manufacturer_id' => $data['manufacturer_id'],
                'customer_id' => $customer?->id,
                'sales_rep_id' => $data['sales_rep_id'] ?? null,
                'public_token' => Str::random(48),
                'status' => OrderStatus::New,
                'order_type' => $requiresQuote ? OrderType::Quote : OrderType::Standard,
                'subtotal_cents' => $pricing['subtotal_cents'],
                'discount_cents' => $pricing['discount_cents'],
                'total_cents' => $pricing['total_cents'],
                'applied_order_rules' => $pricing['applied_order_rules'],
                'customer_name' => $data['customer_name'],
                'customer_phone' => $data['customer_phone'] ?? null,
                'customer_email' => $data['customer_email'] ?? null,
                'customer_document_type' => $data['customer_document_type'] ?? null,
                'customer_document' => $data['customer_document'] ?? null,
                'customer_notes' => $data['customer_notes'] ?? null,
                'customer_zip_code' => $data['customer_zip_code'] ?? null,
                'customer_state' => $data['customer_state'] ?? null,
                'customer_city' => $data['customer_city'] ?? null,
                'customer_neighborhood' => $data['customer_neighborhood'] ?? null,
                'customer_street' => $data['customer_street'] ?? null,
                'customer_address_number' => $data['customer_address_number'] ?? null,
                'customer_address_complement' => $data['customer_address_complement'] ?? null,
                'customer_address_reference' => $data['customer_address_reference'] ?? null,
                'tracking_ref' => $data['tracking_ref'] ?? null,
                'utm_source' => $data['utm_source'] ?? null,
                'utm_medium' => $data['utm_medium'] ?? null,
                'utm_campaign' => $data['utm_campaign'] ?? null,
                'utm_content' => $data['utm_content'] ?? null,
                'utm_term' => $data['utm_term'] ?? null,
            ]);

            $products = $cart['products'];

            foreach ($data['items'] as $index => $item) {
                $product = $products->get($item['product_id']);

                if (! $product) {
                    throw ValidationException::withMessages([
                        'items' => 'Um ou mais produtos nao estao mais disponiveis.',
                    ]);
                }

                $selection = $cart['resolved_items'][$index];
                $reservation = $requiresQuote
                    ? [
                        'product_variant_stock_id' => $selection['product_variant_stock_id'],
                        'selected_variations' => $selection['selected_variations'],
                        'unit_price_cents' => $selection['unit_price_cents'],
                    ]
                    : $this->inventoryReservationService->reserve($product, $item);

                $order->items()->create([
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'product_sku' => $product->sku,
                    'unit_price' => $reservation['unit_price_cents'] !== null
                        ? $reservation['unit_price_cents'] / 100
                        : null,
                    'quantity' => $item['quantity'],
                    'size' => $item['size'] ?? null,
                    'color' => $item['color'] ?? null,
                    'product_variant_stock_id' => $reservation['product_variant_stock_id'],
                    'selected_variations' => $reservation['selected_variations'],
                    'combo_components' => $product->isCombo()
                        ? $this->comboComponentsSnapshot($product)
                        : null,
                ]);
            }

            if (! $requiresQuote) {
                $order->update(['inventory_reserved_at' => now()]);
            }

            $order->statusHistory()->create([
                'from_status' => OrderStatus::New->value,
                'to_status' => OrderStatus::New->value,
                'changed_by_user_id' => null,
                'created_at' => now(),
            ]);

            return $order->load('items');
        });
    }

    /**
     * @return array<int, array{product_id: int, product_name: string|null, product_sku: string|null, variation_key: array<string, string>|null, quantity: int}>
     */
    private function comboComponentsSnapshot(Product $combo): array
    {
        return $combo->comboItems->map(fn ($item) => [
            'product_id' => $item->component_product_id,
            'product_name' => $item->componentProduct?->name,
            'product_sku' => $item->componentProduct?->sku,
            'variation_key' => $item->variation_key,
            'product_variant_stock_id' => $item->component_variant_stock_id,
            'quantity' => $item->quantity,
        ])->values()->all();
    }

    public function updateStatus(Order $order, OrderStatus $newStatus, ?int $userId = null): Order
    {
        return DB::transaction(function () use ($order, $newStatus, $userId): Order {
            $lockedOrder = Order::query()->lockForUpdate()->findOrFail($order->id);
            $oldStatus = $lockedOrder->status;

            if ($newStatus === OrderStatus::Cancelled && $lockedOrder->inventory_reserved_at && ! $lockedOrder->inventory_released_at) {
                $this->inventoryReservationService->release($lockedOrder);
                $lockedOrder->inventory_released_at = now();
            }

            $lockedOrder->status = $newStatus;
            $lockedOrder->save();

            $lockedOrder->statusHistory()->create([
                'from_status' => $oldStatus->value,
                'to_status' => $newStatus->value,
                'changed_by_user_id' => $userId,
                'created_at' => now(),
            ]);

            return $lockedOrder->refresh();
        });
    }
}
