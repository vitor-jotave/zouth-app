<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariantStock;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class InventoryReservationService
{
    /**
     * @param  array{quantity: int, selected_variations?: array<string, string>|null}  $item
     * @return array{product_variant_stock_id: int|null, selected_variations: array<string, string>|null, unit_price_cents: int|null, reserved_quantity: int, combo_component_reservations: array<int, int>}
     */
    public function reserve(Product $product, array $item, bool $allowOrdersWithoutStock = false): array
    {
        $quantity = (int) $item['quantity'];

        if ($product->isCombo()) {
            $componentReservations = $this->reserveCombo(
                $product,
                $quantity,
                $allowOrdersWithoutStock,
            );

            return [
                'product_variant_stock_id' => null,
                'selected_variations' => null,
                'unit_price_cents' => $product->price_cents,
                'reserved_quantity' => 0,
                'combo_component_reservations' => $componentReservations,
            ];
        }

        if ($product->hasVariations()) {
            return $this->reserveVariant(
                $product,
                $item,
                $quantity,
                $allowOrdersWithoutStock,
            );
        }

        $lockedProduct = Product::query()->lockForUpdate()->findOrFail($product->id);
        $reservedQuantity = $this->reservableQuantity(
            $lockedProduct->name,
            $lockedProduct->base_quantity,
            $quantity,
            $allowOrdersWithoutStock,
        );

        if ($reservedQuantity > 0) {
            $lockedProduct->decrement('base_quantity', $reservedQuantity);
        }

        return [
            'product_variant_stock_id' => null,
            'selected_variations' => null,
            'unit_price_cents' => $lockedProduct->price_cents,
            'reserved_quantity' => $reservedQuantity,
            'combo_component_reservations' => [],
        ];
    }

    public function release(Order $order): void
    {
        $order->loadMissing('items');

        foreach ($order->items as $item) {
            if ($item->combo_components) {
                foreach ($item->combo_components as $component) {
                    $quantity = array_key_exists('reserved_quantity', $component)
                        ? (int) $component['reserved_quantity']
                        : (int) $component['quantity'] * $item->quantity;

                    if ($quantity <= 0) {
                        continue;
                    }

                    $variantStockId = $component['product_variant_stock_id'] ?? null;
                    $variationKey = is_array($component['variation_key'] ?? null)
                        ? $component['variation_key']
                        : [];

                    if ($variantStockId || $variationKey !== []) {
                        $this->releaseVariantReservation(
                            $variantStockId ? (int) $variantStockId : null,
                            isset($component['product_id']) ? (int) $component['product_id'] : null,
                            $variationKey,
                            $quantity,
                            $order->id,
                        );
                    } else {
                        Product::query()->whereKey($component['product_id'])->increment('base_quantity', $quantity);
                    }
                }

                continue;
            }

            $quantity = $item->reserved_quantity ?? $item->quantity;

            if ($quantity <= 0) {
                continue;
            }

            if ($item->product_variant_stock_id || $item->selected_variations) {
                $this->releaseVariantReservation(
                    $item->product_variant_stock_id,
                    $item->product_id,
                    $item->selected_variations ?? [],
                    $quantity,
                    $order->id,
                );
            } elseif ($item->product_id) {
                Product::query()->whereKey($item->product_id)->increment('base_quantity', $quantity);
            }
        }
    }

    /**
     * @param  array{quantity: int, selected_variations?: array<string, string>|null}  $item
     * @return array{product_variant_stock_id: int, selected_variations: array<string, string>, unit_price_cents: int|null, reserved_quantity: int, combo_component_reservations: array<int, int>}
     */
    private function reserveVariant(
        Product $product,
        array $item,
        int $quantity,
        bool $allowOrdersWithoutStock,
    ): array {
        $selectedVariations = $this->normalizeVariations($item['selected_variations'] ?? []);

        if ($selectedVariations === []) {
            throw ValidationException::withMessages([
                'items' => "Selecione todas as variacoes de {$product->name}.",
            ]);
        }

        $variantStock = ProductVariantStock::query()
            ->where('product_id', $product->id)
            ->lockForUpdate()
            ->get()
            ->first(fn (ProductVariantStock $stock): bool => $this->normalizeVariations($stock->variation_key) === $selectedVariations);

        if (! $variantStock) {
            throw ValidationException::withMessages([
                'items' => "A combinacao selecionada de {$product->name} nao esta disponivel.",
            ]);
        }

        $reservedQuantity = $this->reservableQuantity(
            $product->name,
            $variantStock->quantity,
            $quantity,
            $allowOrdersWithoutStock,
        );

        if ($reservedQuantity > 0) {
            $variantStock->decrement('quantity', $reservedQuantity);
        }

        return [
            'product_variant_stock_id' => $variantStock->id,
            'selected_variations' => $selectedVariations,
            'unit_price_cents' => $variantStock->price_cents ?? $product->price_cents,
            'reserved_quantity' => $reservedQuantity,
            'combo_component_reservations' => [],
        ];
    }

    /**
     * @return array<int, int>
     */
    private function reserveCombo(
        Product $combo,
        int $quantity,
        bool $allowOrdersWithoutStock,
    ): array {
        $combo->loadMissing('comboItems.componentProduct');
        $reservations = [];

        if ($combo->comboItems->isEmpty()) {
            $this->reservableQuantity(
                $combo->name,
                0,
                $quantity,
                $allowOrdersWithoutStock,
            );

            return [];
        }

        foreach ($combo->comboItems as $component) {
            $required = $component->quantity * $quantity;

            if ($component->component_variant_stock_id) {
                $stock = ProductVariantStock::query()
                    ->lockForUpdate()
                    ->findOrFail($component->component_variant_stock_id);
                $reservedQuantity = $this->reservableQuantity(
                    $combo->name,
                    $stock->quantity,
                    $required,
                    $allowOrdersWithoutStock,
                    $component->quantity,
                );

                if ($reservedQuantity > 0) {
                    $stock->decrement('quantity', $reservedQuantity);
                }

                $reservations[$component->id] = $reservedQuantity;

                continue;
            }

            $product = Product::query()->lockForUpdate()->findOrFail($component->component_product_id);
            $reservedQuantity = $this->reservableQuantity(
                $combo->name,
                $product->base_quantity,
                $required,
                $allowOrdersWithoutStock,
                $component->quantity,
            );

            if ($reservedQuantity > 0) {
                $product->decrement('base_quantity', $reservedQuantity);
            }

            $reservations[$component->id] = $reservedQuantity;
        }

        return $reservations;
    }

    private function reservableQuantity(
        string $productName,
        int $available,
        int $required,
        bool $allowOrdersWithoutStock,
        int $unitsPerCombo = 1,
    ): int {
        if ($allowOrdersWithoutStock) {
            return min(max(0, $available), $required);
        }

        if ($available >= $required) {
            return $required;
        }

        $availableToOrder = intdiv($available, max(1, $unitsPerCombo));

        throw ValidationException::withMessages([
            'items' => "Estoque insuficiente para {$productName}. Disponivel para este pedido: {$availableToOrder}.",
        ]);
    }

    /**
     * @param  array<string, mixed>  $variationKey
     */
    private function releaseVariantReservation(
        ?int $variantStockId,
        ?int $productId,
        array $variationKey,
        int $quantity,
        int $orderId,
    ): void {
        $stock = $variantStockId
            ? ProductVariantStock::query()->find($variantStockId)
            : null;

        if (! $stock && $productId && $variationKey !== []) {
            $normalizedVariations = $this->normalizeVariations($variationKey);
            $stock = ProductVariantStock::query()
                ->where('product_id', $productId)
                ->get()
                ->first(fn (ProductVariantStock $candidate): bool => $this->normalizeVariations($candidate->variation_key) === $normalizedVariations);
        }

        if (! $stock) {
            Log::warning('Could not restore a removed product variation stock', [
                'order_id' => $orderId,
                'product_id' => $productId,
                'product_variant_stock_id' => $variantStockId,
                'variation_key' => $variationKey,
                'quantity' => $quantity,
            ]);

            return;
        }

        $stock->increment('quantity', $quantity);
    }

    /**
     * @param  array<string, mixed>  $variations
     * @return array<string, string>
     */
    private function normalizeVariations(array $variations): array
    {
        $normalized = collect($variations)
            ->mapWithKeys(fn (mixed $value, mixed $name): array => [(string) $name => (string) $value])
            ->sortKeys()
            ->all();

        return $normalized;
    }
}
