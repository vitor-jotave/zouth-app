<?php

namespace App\Http\Resources;

use App\Enums\ProductMediaType;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductMediaResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $type = $this->type instanceof ProductMediaType ? $this->type->value : $this->type;

        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'type' => $type,
            'path' => $this->path,
            'sort_order' => $this->sort_order,
        ];
    }
}
