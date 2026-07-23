<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductVariantStock;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class OrderCartBuilder
{
    /**
     * @param  array<int, array{product_id: int, quantity: int, selected_variations?: array<string, string>|null}>  $items
     * @return array{items: array<int, array{product_id: int, product_category_id: int|null, quantity: int, unit_price_cents: int|null}>, resolved_items: array<int, array{product_variant_stock_id: int|null, selected_variations: array<string, string>|null, unit_price_cents: int|null, requires_quote: bool}>, products: Collection<int, Product>, requires_quote: bool}
     */
    public function build(int $manufacturerId, array $items, bool $lockForUpdate = false): array
    {
        $productIds = collect($items)->pluck('product_id')->unique()->values();
        $query = Product::query()
            ->whereIn('id', $productIds)
            ->where('manufacturer_id', $manufacturerId)
            ->where('is_active', true)
            ->with([
                'comboItems.componentProduct',
                'productVariations',
                'variantStocks',
            ]);

        if ($lockForUpdate) {
            $query->lockForUpdate();
        }

        $products = $query->get()->keyBy('id');

        if ($products->count() !== $productIds->count()) {
            throw ValidationException::withMessages([
                'items' => 'Um ou mais produtos não estão mais disponíveis.',
            ]);
        }

        $resolvedItems = collect($items)->map(function (array $item) use ($products): array {
            /** @var Product $product */
            $product = $products->get($item['product_id']);
            $resolved = $this->resolveSelection($product, $item);
            $quantity = (int) $item['quantity'];
            $requiresQuote = $quantity > $resolved['available_quantity'];

            if ($requiresQuote && ! $product->allow_quote_when_out_of_stock) {
                throw ValidationException::withMessages([
                    'items' => "Estoque insuficiente para {$product->name}. Disponível para este pedido: {$resolved['available_quantity']}.",
                ]);
            }

            return [
                'product_id' => $product->id,
                'product_category_id' => $product->product_category_id,
                'quantity' => $quantity,
                'unit_price_cents' => $resolved['unit_price_cents'],
                'product_variant_stock_id' => $resolved['product_variant_stock_id'],
                'selected_variations' => $resolved['selected_variations'],
                'requires_quote' => $requiresQuote,
            ];
        });

        $cartItems = $resolvedItems->map(fn (array $item): array => [
            'product_id' => $item['product_id'],
            'product_category_id' => $item['product_category_id'],
            'quantity' => $item['quantity'],
            'unit_price_cents' => $item['unit_price_cents'],
        ])->all();

        return [
            'items' => $cartItems,
            'resolved_items' => $resolvedItems->map(fn (array $item): array => [
                'product_variant_stock_id' => $item['product_variant_stock_id'],
                'selected_variations' => $item['selected_variations'],
                'unit_price_cents' => $item['unit_price_cents'],
                'requires_quote' => $item['requires_quote'],
            ])->all(),
            'products' => $products,
            'requires_quote' => $resolvedItems->contains(fn (array $item): bool => $item['requires_quote']),
        ];
    }

    /**
     * @param  array{selected_variations?: array<string, string>|null}  $item
     * @return array{product_variant_stock_id: int|null, selected_variations: array<string, string>|null, unit_price_cents: int|null, available_quantity: int}
     */
    private function resolveSelection(Product $product, array $item): array
    {
        if ($product->isCombo() || $product->productVariations->isEmpty()) {
            return [
                'product_variant_stock_id' => null,
                'selected_variations' => null,
                'unit_price_cents' => $product->price_cents,
                'available_quantity' => $product->getTotalStock(),
            ];
        }

        $selectedVariations = $this->normalizeVariations($item['selected_variations'] ?? []);

        if ($selectedVariations === []) {
            throw ValidationException::withMessages([
                'items' => "Selecione todas as variações de {$product->name}.",
            ]);
        }

        $variantStock = $product->variantStocks->first(
            fn (ProductVariantStock $stock): bool => $this->normalizeVariations($stock->variation_key) === $selectedVariations,
        );

        if (! $variantStock) {
            throw ValidationException::withMessages([
                'items' => "A combinação selecionada de {$product->name} não está disponível.",
            ]);
        }

        return [
            'product_variant_stock_id' => $variantStock->id,
            'selected_variations' => $selectedVariations,
            'unit_price_cents' => $variantStock->price_cents ?? $product->price_cents,
            'available_quantity' => (int) $variantStock->quantity,
        ];
    }

    /**
     * @param  array<string, mixed>  $variations
     * @return array<string, string>
     */
    private function normalizeVariations(array $variations): array
    {
        return collect($variations)
            ->mapWithKeys(fn (mixed $value, mixed $name): array => [(string) $name => (string) $value])
            ->sortKeys()
            ->all();
    }
}
