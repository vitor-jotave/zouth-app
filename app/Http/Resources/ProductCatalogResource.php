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

        $variantStocks = $this->variantStocks ?? collect();

        $variations = ($this->productVariations ?? collect())
            ->map(function ($pv) use ($variantStocks) {
                $type = $pv->variationType;
                $typeName = $type->name ?? '';
                $stockValues = $variantStocks
                    ->map(fn ($stock) => data_get($stock->variation_key, $typeName))
                    ->map(fn (mixed $value) => (string) $value)
                    ->filter()
                    ->unique()
                    ->values();

                $values = ($type->values ?? collect())
                    ->filter(fn ($value) => $stockValues->contains($value->value))
                    ->map(fn ($value) => [
                        'value' => $value->value,
                        'hex' => $value->hex,
                        'image_url' => $value->image_path ? Storage::disk('s3')->url($value->image_path) : null,
                    ])
                    ->values()
                    ->all();

                return [
                    'type_name' => $typeName,
                    'is_color_type' => $type->is_color_type ?? false,
                    'values' => $values,
                ];
            })
            ->filter(fn (array $variation) => $variation['values'] !== [])
            ->values()
            ->all();

        return [
            'id' => $this->id,
            'product_type' => $this->product_type,
            'name' => $this->name,
            'sku' => $this->sku,
            'description' => $this->description,
            'category' => $this->category?->name,
            'primary_image' => $primaryImage ? Storage::disk('s3')->url($primaryImage->path) : null,
            'images' => $images->map(fn ($item) => Storage::disk('s3')->url($item->path))->values(),
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
