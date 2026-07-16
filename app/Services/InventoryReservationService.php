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
     * @return array{product_variant_stock_id: int|null, selected_variations: array<string, string>|null, unit_price_cents: int|null}
     */
    public function reserve(Product $product, array $item): array
    {
        $quantity = (int) $item['quantity'];

        if ($product->isCombo()) {
            $this->reserveCombo($product, $quantity);

            return [
                'product_variant_stock_id' => null,
                'selected_variations' => null,
                'unit_price_cents' => $product->price_cents,
            ];
        }

        if ($product->hasVariations()) {
            return $this->reserveVariant($product, $item, $quantity);
        }

        $lockedProduct = Product::query()->lockForUpdate()->findOrFail($product->id);
        $this->ensureAvailable($lockedProduct->name, $lockedProduct->base_quantity, $quantity);
        $lockedProduct->decrement('base_quantity', $quantity);

        return [
            'product_variant_stock_id' => null,
            'selected_variations' => null,
            'unit_price_cents' => $lockedProduct->price_cents,
        ];
    }

    public function release(Order $order): void
    {
        $order->loadMissing('items');

        foreach ($order->items as $item) {
            if ($item->combo_components) {
                foreach ($item->combo_components as $component) {
                    $quantity = (int) $component['quantity'] * $item->quantity;
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

            if ($item->product_variant_stock_id || $item->selected_variations) {
                $this->releaseVariantReservation(
                    $item->product_variant_stock_id,
                    $item->product_id,
                    $item->selected_variations ?? [],
                    $item->quantity,
                    $order->id,
                );
            } elseif ($item->product_id) {
                Product::query()->whereKey($item->product_id)->increment('base_quantity', $item->quantity);
            }
        }
    }

    /**
     * @param  array{quantity: int, selected_variations?: array<string, string>|null}  $item
     * @return array{product_variant_stock_id: int, selected_variations: array<string, string>, unit_price_cents: int|null}
     */
    private function reserveVariant(Product $product, array $item, int $quantity): array
    {
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

        $this->ensureAvailable($product->name, $variantStock->quantity, $quantity);
        $variantStock->decrement('quantity', $quantity);

        return [
            'product_variant_stock_id' => $variantStock->id,
            'selected_variations' => $selectedVariations,
            'unit_price_cents' => $variantStock->price_cents ?? $product->price_cents,
        ];
    }

    private function reserveCombo(Product $combo, int $quantity): void
    {
        $combo->loadMissing('comboItems.componentProduct');

        if ($combo->comboItems->isEmpty()) {
            $this->ensureAvailable($combo->name, 0, $quantity);
        }

        foreach ($combo->comboItems as $component) {
            $required = $component->quantity * $quantity;

            if ($component->component_variant_stock_id) {
                $stock = ProductVariantStock::query()
                    ->lockForUpdate()
                    ->findOrFail($component->component_variant_stock_id);
                $this->ensureAvailable($combo->name, $stock->quantity, $required, $component->quantity);
                $stock->decrement('quantity', $required);

                continue;
            }

            $product = Product::query()->lockForUpdate()->findOrFail($component->component_product_id);
            $this->ensureAvailable($combo->name, $product->base_quantity, $required, $component->quantity);
            $product->decrement('base_quantity', $required);
        }
    }

    private function ensureAvailable(string $productName, int $available, int $required, int $unitsPerCombo = 1): void
    {
        if ($available >= $required) {
            return;
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
