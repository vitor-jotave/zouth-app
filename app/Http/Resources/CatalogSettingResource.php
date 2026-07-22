<?php

namespace App\Http\Resources;

use App\Models\CatalogSetting;
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
        $catalogMediaDisk = (string) config('filesystems.catalog_media_disk', 'public');

        return [
            'id' => $this->id,
            'manufacturer_id' => $this->manufacturer_id,
            'brand_name' => $this->brand_name,
            'show_brand_name' => $this->show_brand_name ?? true,
            'show_logo' => $this->show_logo ?? true,
            'hide_prices' => $this->hide_prices ?? false,
            'tagline' => $this->tagline,
            'description' => $this->description,
            'logo_path' => $this->logo_path,
            'logo_url' => $this->logo_path ? Storage::disk($catalogMediaDisk)->url($this->logo_path) : null,
            'cover_image_path' => $this->cover_image_path,
            'cover_image_url' => $this->cover_image_path ? Storage::disk($catalogMediaDisk)->url($this->cover_image_path) : null,
            'cover_thumbnail_path' => $this->cover_thumbnail_path,
            'cover_thumbnail_url' => $this->cover_thumbnail_path ? Storage::disk($catalogMediaDisk)->url($this->cover_thumbnail_path) : null,
            'cover_image_focal_x' => $this->cover_image_focal_x ?? 50,
            'cover_image_focal_y' => $this->cover_image_focal_y ?? 50,
            'primary_color' => $this->primary_color,
            'secondary_color' => $this->secondary_color,
            'accent_color' => $this->accent_color,
            'background_color' => $this->background_color,
            'font_family' => $this->font_family,
            'heading_font_family' => $this->heading_font_family ?: $this->font_family,
            'body_font_family' => $this->body_font_family ?: $this->font_family,
            'public_token' => $this->public_token,
            'public_token_rotated_at' => $this->public_token_rotated_at,
            'public_link_active' => $this->public_link_active,

            // Premium customization
            'layout_preset' => $this->layout_preset ?? 'minimal',
            'layout_density' => $this->layout_density ?? 'comfortable',
            'card_style' => $this->card_style ?? 'soft',
            'background_mode' => $this->background_mode ?? 'solid',
            'background_image_path' => $this->background_image_path,
            'background_image_url' => $this->background_image_path ? Storage::disk($catalogMediaDisk)->url($this->background_image_path) : null,
            'background_image_opacity' => $this->background_image_opacity ?? 20,
            'background_overlay_color' => $this->background_overlay_color ?? '#000000',
            'background_overlay_opacity' => $this->background_overlay_opacity ?? 10,
            'background_blur' => $this->background_blur ?? 0,
            'pattern_id' => $this->pattern_id,
            'pattern_color' => $this->pattern_color,
            'pattern_opacity' => $this->pattern_opacity ?? 12,
            'gradient_id' => $this->gradient_id,
            'sections' => $this->sections ?? CatalogSetting::defaultSections(),
        ];
    }
}
