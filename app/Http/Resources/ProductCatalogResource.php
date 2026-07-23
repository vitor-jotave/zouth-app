<?php

namespace App\Http\Resources;

use App\Enums\ProductMediaType;
use App\Support\ProductVideo;
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
        $hidePrices = $request->attributes->get('catalog_hide_prices', false) === true;
        $allowOrdersWithoutStock = $request->attributes->get(
            'catalog_allow_orders_without_stock',
            false,
        ) === true;
        $media = $this->displayMedia();
        $images = $media->filter(fn ($item) => ($item->type instanceof ProductMediaType)
            ? $item->type === ProductMediaType::Image
            : $item->type === ProductMediaType::Image->value);
        $videos = $media->filter(fn ($item) => ($item->type instanceof ProductMediaType)
            ? $item->type === ProductMediaType::Video
            : $item->type === ProductMediaType::Video->value);
        $primaryImage = $images->first();
        $linkedVideo = ProductVideo::fromUrl($this->video_url);

        $variantStocks = $this->variantStocks ?? collect();

        $variations = ($this->productVariations ?? collect())
            ->map(function ($pv) use ($variantStocks, $allowOrdersWithoutStock) {
                $type = $pv->variationType;
                $typeName = $type->name ?? '';
                $stockValues = $variantStocks
                    ->filter(
                        fn ($stock) => $allowOrdersWithoutStock
                            || (int) $stock->quantity > 0
                            || $this->allow_quote_when_out_of_stock,
                    )
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
                        'image_url' => ($value->thumbnail_path ?: $value->image_path)
                            ? Storage::disk('s3')->url($value->thumbnail_path ?: $value->image_path)
                            : null,
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
            'category_id' => $this->product_category_id,
            'category' => $this->category?->name,
            'primary_image' => $primaryImage ? Storage::disk('s3')->url($primaryImage->path) : null,
            'primary_thumbnail' => $primaryImage
                ? Storage::disk('s3')->url($primaryImage->thumbnail_path ?: $primaryImage->path)
                : null,
            'images' => $images->map(fn ($item) => Storage::disk('s3')->url($item->path))->values(),
            'thumbnails' => $images
                ->map(fn ($item) => Storage::disk('s3')->url($item->thumbnail_path ?: $item->path))
                ->values(),
            'videos' => $videos->map(fn ($item) => Storage::disk('s3')->url($item->path))->values(),
            'video' => $linkedVideo?->toArray(),
            'variations' => $variations,
            'variant_stocks' => $this->variantStocks?->map(function ($stock) use ($hidePrices): array {
                $stockData = [
                    'variation_key' => $stock->variation_key,
                    'quantity' => $stock->quantity,
                ];

                if (! $hidePrices) {
                    $stockData['price_cents'] = $stock->price_cents;
                }

                return $stockData;
            }) ?? [],
            'combo_items' => $this->comboItems?->map(fn ($item) => [
                'product_id' => $item->component_product_id,
                'product_name' => $item->componentProduct?->name,
                'product_sku' => $item->componentProduct?->sku,
                'variation_key' => $item->variation_key,
                'quantity' => $item->quantity,
            ])->values() ?? [],
            'total_stock' => $this->getTotalStock(),
            'allow_quote_when_out_of_stock' => (bool) $this->allow_quote_when_out_of_stock,
            'price_cents' => $this->when(! $hidePrices, $this->price_cents),
        ];
    }
}
