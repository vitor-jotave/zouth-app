<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SendWhatsappProductPdfRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isManufacturerUser();
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'product_ids' => ['required', 'array', 'min:2', 'max:30'],
            'product_ids.*' => ['required', 'integer', 'distinct', 'exists:products,id'],
            'include_photo' => ['required', 'boolean'],
            'include_price' => ['required', 'boolean'],
            'include_description' => ['required', 'boolean'],
            'include_sku' => ['required', 'boolean'],
        ];
    }
}
