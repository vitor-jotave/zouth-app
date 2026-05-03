<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ProductComboValidationRules;
use App\Models\Product;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class UpdateProductComboRequest extends FormRequest
{
    use ProductComboValidationRules;

    public function authorize(): bool
    {
        $product = $this->route('product');

        return $product instanceof Product
            ? $this->user()?->can('update', $product) ?? false
            : false;
    }

    protected function prepareForValidation(): void
    {
        $this->productComboPrepareForValidation();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $product = $this->route('product');

        return $this->productComboRules($this->user()?->current_manufacturer_id, $product?->id);
    }

    public function messages(): array
    {
        return $this->productComboMessages();
    }

    public function withValidator(Validator $validator): void
    {
        $product = $this->route('product');

        $this->productComboAfterValidation($validator, $product instanceof Product ? $product : null);
    }
}
