<?php

namespace App\Http\Resources;

use App\Enums\ProductMediaType;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class WhatsappProductResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $primaryImage = ($this->media ?? collect())
            ->first(fn ($media) => $media->type === ProductMediaType::Image);

        return [
            'id' => $this->id,
            'name' => $this->name,
            'sku' => $this->sku,
            'description' => $this->description,
            'price_cents' => $this->price_cents,
            'primary_image_url' => $primaryImage ? Storage::disk('s3')->url($primaryImage->path) : null,
        ];
    }
}
