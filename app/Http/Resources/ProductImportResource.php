<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductImportResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status->value,
            'status_label' => $this->status->value === 'mapping' && data_get($this->summary, 'rows')
                ? 'Revisão necessária'
                : $this->status->label(),
            'source_name' => $this->source_name,
            'source_extension' => $this->source_extension,
            'has_image_archive' => $this->image_archive_path !== null,
            'headers' => $this->headers ?? [],
            'mapping' => $this->mapping ?? [],
            'summary' => $this->summary ?? [],
            'taxonomy_preview' => $this->taxonomy_preview ?? [
                'categories' => [],
                'variation_types' => [],
                'variation_values' => [],
            ],
            'errors' => $this->errors ?? [],
            'preview_signature' => $this->preview_signature,
            'progress' => $this->progress,
            'error_message' => $this->error_message,
            'created_at' => $this->created_at?->toIso8601String(),
            'created_at_label' => $this->created_at?->timezone(config('app.timezone'))->format('d/m/Y \à\s H:i'),
            'validated_at' => $this->validated_at?->toIso8601String(),
            'completed_at' => $this->completed_at?->toIso8601String(),
            'rows' => $this->whenLoaded('rows', fn () => $this->rows->map(fn ($row): array => [
                'id' => $row->id,
                'row_number' => $row->row_number,
                'product_sku' => $row->product_sku,
                'variant_identity' => $row->variant_identity,
                'action' => $row->action,
                'source' => $row->source,
                'normalized' => $row->normalized,
                'errors' => $row->errors ?? [],
                'warnings' => $row->warnings ?? [],
                'product_id' => $row->product_id,
                'processed_at' => $row->processed_at?->toIso8601String(),
            ])->values()),
        ];
    }
}
