<?php

namespace App\Services;

use App\Models\Product;

class ProductStockService
{
    public function getTotalStock(Product $product): int
    {
        return $product->getTotalStock();
    }

    public function getStockStructure(Product $product): array
    {
        $variantStocks = $product->variantStocks()->with('color')->get();

        $sizes = $product->has_size_variants
            ? $variantStocks->pluck('size')->filter()->unique()->values()
            : collect();

        $colors = $product->has_color_variants
            ? $product->colors()->orderBy('name')->get(['id', 'name', 'hex'])
            : collect();

        return [
            'has_size_variants' => $product->has_size_variants,
            'has_color_variants' => $product->has_color_variants,
            'base_quantity' => $product->base_quantity,
            'sizes' => $sizes,
            'colors' => $colors,
            'stocks' => $variantStocks->map(fn ($stock) => [
                'id' => $stock->id,
                'size' => $stock->size?->value,
                'color' => $stock->color ? [
                    'id' => $stock->color->id,
                    'name' => $stock->color->name,
                    'hex' => $stock->color->hex,
                ] : null,
                'quantity' => $stock->quantity,
                'sku_variant' => $stock->sku_variant,
            ]),
        ];
    }
}
