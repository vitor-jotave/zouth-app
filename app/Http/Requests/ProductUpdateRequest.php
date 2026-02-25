<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ProductValidationRules;
use App\Models\Product;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class ProductUpdateRequest extends FormRequest
{
    use ProductValidationRules;

    public function authorize(): bool
    {
        $product = $this->route('product');

        return $product instanceof Product
            ? $this->user()?->can('update', $product) ?? false
            : false;
    }

    protected function prepareForValidation(): void
    {
        $this->productPrepareForValidation();
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $manufacturerId = $this->user()?->current_manufacturer_id;
        $product = $this->route('product');

        return $this->productRules($manufacturerId, $product?->id);
    }

    public function messages(): array
    {
        return $this->productMessages();
    }

    public function withValidator(Validator $validator): void
    {
        $this->productAfterValidation($validator);
    }
}
