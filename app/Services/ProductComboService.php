<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductVariantStock;
use Illuminate\Support\Facades\DB;

class ProductComboService
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function createCombo(array $data): Product
    {
        return $this->upsert(null, $data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function updateCombo(Product $combo, array $data): Product
    {
        return $this->upsert($combo, $data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function upsert(?Product $combo, array $data): Product
    {
        return DB::transaction(function () use ($combo, $data) {
            $payload = [
                'manufacturer_id' => $data['manufacturer_id'],
                'product_category_id' => $data['product_category_id'] ?? null,
                'product_type' => 'combo',
                'name' => $data['name'],
                'sku' => $data['sku'],
                'description' => $data['description'] ?? null,
                'base_quantity' => 0,
                'is_active' => array_key_exists('is_active', $data) ? (bool) $data['is_active'] : true,
                'sort_order' => (int) ($data['sort_order'] ?? 0),
                'price_cents' => $this->toCents($data['price'] ?? null),
            ];

            if ($combo) {
                $combo->update($payload);
            } else {
                $combo = Product::create($payload);
            }

            $combo->productVariations()->delete();
            $combo->variantStocks()->delete();
            $combo->comboItems()->delete();

            foreach ($data['combo_items'] as $item) {
                $variantStock = isset($item['component_variant_stock_id'])
                    ? ProductVariantStock::find($item['component_variant_stock_id'])
                    : null;

                $combo->comboItems()->create([
                    'component_product_id' => $item['component_product_id'],
                    'component_variant_stock_id' => $variantStock?->id,
                    'variation_key' => $variantStock?->variation_key,
                    'quantity' => (int) $item['quantity'],
                ]);
            }

            return $combo->fresh(['category', 'media', 'comboItems.componentProduct', 'comboItems.componentVariantStock']);
        });
    }

    private function toCents(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        return (int) round((float) $value * 100);
    }
}
