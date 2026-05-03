<?php

namespace App\Http\Resources;

use App\Enums\ProductMediaType;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class ProductCatalogResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $media = $this->media ?? collect();
        $images = $media->filter(fn ($item) => ($item->type instanceof ProductMediaType)
            ? $item->type === ProductMediaType::Image
            : $item->type === ProductMediaType::Image->value);
        $primaryImage = $images->first();

        // Build variation info from product_variations relationship
        $variations = ($this->productVariations ?? collect())->map(fn ($pv) => [
            'type_name' => $pv->variationType->name ?? '',
            'is_color_type' => $pv->variationType->is_color_type ?? false,
            'values' => ($pv->variationType->values ?? collect())->map(fn ($val) => [
                'value' => $val->value,
                'hex' => $val->hex,
            ])->values()->all(),
        ])->values()->all();

        return [
            'id' => $this->id,
            'product_type' => $this->product_type,
            'name' => $this->name,
            'sku' => $this->sku,
            'category' => $this->category?->name,
            'primary_image' => $primaryImage ? Storage::url($primaryImage->path) : null,
            'images' => $images->map(fn ($item) => Storage::url($item->path))->values(),
            'variations' => $variations,
            'variant_stocks' => $this->variantStocks?->map(fn ($stock) => [
                'variation_key' => $stock->variation_key,
                'quantity' => $stock->quantity,
                'price_cents' => $stock->price_cents,
            ]) ?? [],
            'combo_items' => $this->comboItems?->map(fn ($item) => [
                'product_id' => $item->component_product_id,
                'product_name' => $item->componentProduct?->name,
                'product_sku' => $item->componentProduct?->sku,
                'variation_key' => $item->variation_key,
                'quantity' => $item->quantity,
            ])->values() ?? [],
            'total_stock' => $this->getTotalStock(),
            'price_cents' => $this->price_cents,
        ];
    }
}
