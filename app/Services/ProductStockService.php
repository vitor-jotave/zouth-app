<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Support\Facades\Storage;

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
     *     variations: array<int, array{id: int, type: array{id: int, name: string, is_color_type: bool}, values: array<int, array{id: int, value: string, hex: string|null, image_url: string|null}>}>,
     *     base_quantity: int,
     *     stocks: array<int, array{id: int, variation_key: array<string, string>, quantity: int, price_cents: int|null, sku_variant: string|null}>
     * }
     */
    public function getStockStructure(Product $product): array
    {
        $product->load(['productVariations.variationType.values', 'variantStocks']);

        $usedValuesByType = [];

        foreach ($product->variantStocks as $stock) {
            foreach ($stock->variation_key as $typeName => $value) {
                $usedValuesByType[$typeName][(string) $value] = true;
            }
        }

        $variations = $product->productVariations->map(function ($productVariation) use ($usedValuesByType) {
            $variationType = $productVariation->variationType;
            $usedValues = $usedValuesByType[$variationType->name] ?? [];

            return [
                'id' => $productVariation->id,
                'type' => [
                    'id' => $variationType->id,
                    'name' => $variationType->name,
                    'is_color_type' => $variationType->is_color_type,
                ],
                'values' => $variationType->values
                    ->filter(fn ($value) => isset($usedValues[(string) $value->value]))
                    ->map(fn ($value) => [
                        'id' => $value->id,
                        'value' => $value->value,
                        'hex' => $value->hex,
                        'image_url' => $value->image_path ? Storage::disk('s3')->url($value->image_path) : null,
                    ])
                    ->values()
                    ->all(),
            ];
        })->values()->all();

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
