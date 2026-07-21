<?php

namespace App\Http\Resources;

use App\Enums\ProductMediaType;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class OrderItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $imageUrls = $this->relationLoaded('product') && $this->product
            ? $this->product->displayMedia()
                ->filter(fn ($media): bool => $media->type === ProductMediaType::Image)
                ->take(3)
                ->map(fn ($media): string => Storage::disk('s3')->url($media->thumbnail_path ?: $media->path))
                ->values()
                ->all()
            : [];

        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'product_name' => $this->product_name,
            'product_sku' => $this->product_sku,
            'unit_price' => $this->unit_price,
            'quantity' => $this->quantity,
            'size' => $this->size,
            'color' => $this->color,
            'selected_variations' => $this->selected_variations,
            'combo_components' => $this->combo_components,
            'image_urls' => $imageUrls,
        ];
    }
}
