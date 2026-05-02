<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'public_token' => $this->public_token,
            'customer_id' => $this->customer_id,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'customer_name' => $this->customer_name,
            'customer_phone' => $this->customer_phone,
            'customer_email' => $this->customer_email,
            'customer_document_type' => $this->customer_document_type,
            'customer_document' => $this->customer_document,
            'customer_notes' => $this->customer_notes,
            'customer_zip_code' => $this->customer_zip_code,
            'customer_state' => $this->customer_state,
            'customer_city' => $this->customer_city,
            'customer_neighborhood' => $this->customer_neighborhood,
            'customer_street' => $this->customer_street,
            'customer_address_number' => $this->customer_address_number,
            'customer_address_complement' => $this->customer_address_complement,
            'customer_address_reference' => $this->customer_address_reference,
            'internal_notes' => $this->internal_notes,
            'tracking_ref' => $this->tracking_ref,
            'items' => $this->whenLoaded('items', fn () => OrderItemResource::collection($this->items)->resolve()),
            'status_history' => $this->whenLoaded('statusHistory', fn () => OrderStatusHistoryResource::collection($this->statusHistory)->resolve()),
            'sales_rep' => $this->whenLoaded('salesRep', fn () => [
                'id' => $this->salesRep->id,
                'name' => $this->salesRep->name,
            ]),
            'total_items' => $this->whenLoaded('items', fn () => $this->items->sum('quantity')),
            'allowed_transitions' => collect($this->status->allowedTransitions())->map(fn ($s) => [
                'value' => $s->value,
                'label' => $s->label(),
            ])->values(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
