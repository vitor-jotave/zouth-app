<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CustomerResource extends JsonResource
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
            'name' => $this->name,
            'phone' => $this->phone,
            'email' => $this->email,
            'customer_document_type' => $this->customer_document_type,
            'customer_document' => $this->customer_document,
            'zip_code' => $this->zip_code,
            'state' => $this->state,
            'city' => $this->city,
            'neighborhood' => $this->neighborhood,
            'street' => $this->street,
            'address_number' => $this->address_number,
            'address_complement' => $this->address_complement,
            'address_reference' => $this->address_reference,
            'orders_count' => (int) ($this->orders_count ?? 0),
            'last_order_at' => $this->last_order_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
