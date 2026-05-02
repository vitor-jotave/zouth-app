<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SendWhatsappProductMessageRequest extends FormRequest
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
            'include_photo' => ['required', 'boolean'],
            'include_price' => ['required', 'boolean'],
            'include_description' => ['required', 'boolean'],
            'include_sku' => ['required', 'boolean'],
        ];
    }
}
