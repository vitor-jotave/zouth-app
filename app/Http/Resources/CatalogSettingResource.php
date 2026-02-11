<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class CatalogSettingResource extends JsonResource
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
            'brand_name' => $this->brand_name,
            'tagline' => $this->tagline,
            'description' => $this->description,
            'logo_path' => $this->logo_path,
            'logo_url' => $this->logo_path ? Storage::disk('public')->url($this->logo_path) : null,
            'primary_color' => $this->primary_color,
            'secondary_color' => $this->secondary_color,
            'accent_color' => $this->accent_color,
            'background_color' => $this->background_color,
            'font_family' => $this->font_family,
            'public_token' => $this->public_token,
            'public_token_rotated_at' => $this->public_token_rotated_at,
            'public_link_active' => $this->public_link_active,
        ];
    }
}
