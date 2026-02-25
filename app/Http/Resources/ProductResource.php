<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'manufacturer_id' => $this->manufacturer_id,
            'product_category_id' => $this->product_category_id,
            'name' => $this->name,
            'sku' => $this->sku,
            'description' => $this->description,
            'base_quantity' => $this->base_quantity,
            'is_active' => $this->is_active,
            'sort_order' => $this->sort_order,
            'price_cents' => $this->price_cents,
            'total_stock' => $this->getTotalStock(),
            'category' => $this->whenLoaded('category', fn () => new ProductCategoryResource($this->category)),
            'media' => $this->whenLoaded('media', fn () => ProductMediaResource::collection($this->media)->resolve()),
            'variations' => $this->whenLoaded('productVariations', fn () => $this->productVariations->map(fn ($pv) => [
                'id' => $pv->id,
                'variation_type_id' => $pv->variation_type_id,
                'type' => $pv->relationLoaded('variationType') ? [
                    'id' => $pv->variationType->id,
                    'name' => $pv->variationType->name,
                    'is_color_type' => $pv->variationType->is_color_type,
                    'values' => $pv->variationType->relationLoaded('values')
                        ? $pv->variationType->values->map(fn ($val) => [
                            'id' => $val->id,
                            'value' => $val->value,
                            'hex' => $val->hex,
                        ])->values()->all()
                        : [],
                ] : null,
            ])),
            'variant_stocks' => $this->whenLoaded('variantStocks', fn () => $this->variantStocks->map(fn ($stock) => [
                'id' => $stock->id,
                'variation_key' => $stock->variation_key,
                'quantity' => $stock->quantity,
                'price_cents' => $stock->price_cents,
                'sku_variant' => $stock->sku_variant,
            ])),
        ];
    }
}
