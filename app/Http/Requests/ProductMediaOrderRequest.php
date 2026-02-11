<?php

namespace App\Http\Requests;

use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductMediaOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        $product = $this->route('product');

        return $product instanceof Product
            ? $this->user()?->can('update', $product) ?? false
            : false;
    }

    public function rules(): array
    {
        $product = $this->route('product');

        return [
            'media_order' => ['required', 'array'],
            'media_order.*' => [
                'integer',
                Rule::exists('product_media', 'id')->where('product_id', $product?->id),
            ],
        ];
    }
}
