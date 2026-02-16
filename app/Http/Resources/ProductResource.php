<?php

namespace App\Http\Resources;

use App\Enums\ProductSize;
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
            'has_size_variants' => $this->has_size_variants,
            'has_color_variants' => $this->has_color_variants,
            'base_quantity' => $this->base_quantity,
            'is_active' => $this->is_active,
            'sort_order' => $this->sort_order,
            'price_cents' => $this->price_cents,
            'total_stock' => $this->getTotalStock(),
            'category' => $this->whenLoaded('category', fn () => new ProductCategoryResource($this->category)),
            'media' => $this->whenLoaded('media', fn () => ProductMediaResource::collection($this->media)->resolve()),
            'colors' => $this->whenLoaded('colors', fn () => $this->colors->map(fn ($color) => [
                'id' => $color->id,
                'name' => $color->name,
                'hex' => $color->hex,
            ])),
            'variant_stocks' => $this->whenLoaded('variantStocks', fn () => $this->variantStocks->map(fn ($stock) => [
                'id' => $stock->id,
                'size' => $stock->size instanceof ProductSize ? $stock->size->value : $stock->size,
                'product_color_id' => $stock->product_color_id,
                'quantity' => $stock->quantity,
                'sku_variant' => $stock->sku_variant,
            ])),
        ];
    }
}
