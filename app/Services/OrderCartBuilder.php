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
     * @return array{items: array<int, array{product_id: int, product_category_id: int|null, quantity: int, unit_price_cents: int|null}>, products: Collection<int, Product>}
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

        $cartItems = collect($items)->map(function (array $item) use ($products): array {
            /** @var Product $product */
            $product = $products->get($item['product_id']);

            return [
                'product_id' => $product->id,
                'product_category_id' => $product->product_category_id,
                'quantity' => (int) $item['quantity'],
                'unit_price_cents' => $this->resolveUnitPrice($product, $item),
            ];
        })->all();

        return [
            'items' => $cartItems,
            'products' => $products,
        ];
    }

    /**
     * @param  array{selected_variations?: array<string, string>|null}  $item
     */
    private function resolveUnitPrice(Product $product, array $item): ?int
    {
        if ($product->isCombo() || $product->productVariations->isEmpty()) {
            return $product->price_cents;
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

        return $variantStock->price_cents ?? $product->price_cents;
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
