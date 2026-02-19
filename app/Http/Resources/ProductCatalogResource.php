<?php

namespace App\Http\Resources;

use App\Enums\ProductMediaType;
use App\Enums\ProductSize;
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

        $sizes = $this->variantStocks
            ? $this->variantStocks->pluck('size')->filter()->unique()->values()->map(function ($size) {
                return $size instanceof ProductSize ? $size->value : $size;
            })
            : collect();

        return [
            'id' => $this->id,
            'name' => $this->name,
            'sku' => $this->sku,
            'category' => $this->category?->name,
            'primary_image' => $primaryImage ? Storage::url($primaryImage->path) : null,
            'images' => $images->map(fn ($item) => Storage::url($item->path))->values(),
            'has_size_variants' => $this->has_size_variants,
            'has_color_variants' => $this->has_color_variants,
            'sizes' => $sizes,
            'colors' => $this->colors?->map(fn ($color) => [
                'name' => $color->name,
                'hex' => $color->hex,
            ]) ?? [],
            'variant_stocks' => $this->variantStocks?->map(fn ($stock) => [
                'size' => $stock->size instanceof ProductSize ? $stock->size->value : $stock->size,
                'color' => $stock->color?->name,
                'quantity' => $stock->quantity,
            ]) ?? [],
            'total_stock' => $this->getTotalStock(),
            'price_cents' => $this->price_cents,
        ];
    }
}
