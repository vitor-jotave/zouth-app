<?php

namespace App\Services;

use App\Models\Product;

class ProductStockService
{
    public function getTotalStock(Product $product): int
    {
        return $product->getTotalStock();
    }

    /**
     * Build a structured representation of the product's variation stock.
     *
     * @return array{
     *     variations: array<int, array{id: int, type: array{id: int, name: string, is_color_type: bool}, values: array<int, array{id: int, value: string, hex: string|null}>}>,
     *     base_quantity: int,
     *     stocks: array<int, array{id: int, variation_key: array<string, string>, quantity: int, price_cents: int|null, sku_variant: string|null}>
     * }
     */
    public function getStockStructure(Product $product): array
    {
        $product->load(['productVariations.variationType.values', 'variantStocks']);

        $variations = $product->productVariations->map(fn ($pv) => [
            'id' => $pv->id,
            'type' => [
                'id' => $pv->variationType->id,
                'name' => $pv->variationType->name,
                'is_color_type' => $pv->variationType->is_color_type,
            ],
            'values' => $pv->variationType->values->map(fn ($val) => [
                'id' => $val->id,
                'value' => $val->value,
                'hex' => $val->hex,
            ])->values()->all(),
        ])->values()->all();

        $stocks = $product->variantStocks->map(fn ($stock) => [
            'id' => $stock->id,
            'variation_key' => $stock->variation_key,
            'quantity' => $stock->quantity,
            'price_cents' => $stock->price_cents,
            'sku_variant' => $stock->sku_variant,
        ])->values()->all();

        return [
            'variations' => $variations,
            'base_quantity' => $product->base_quantity,
            'stocks' => $stocks,
        ];
    }
}
