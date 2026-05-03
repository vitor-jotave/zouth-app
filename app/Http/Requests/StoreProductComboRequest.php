<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ProductComboValidationRules;
use App\Models\Product;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class StoreProductComboRequest extends FormRequest
{
    use ProductComboValidationRules;

    public function authorize(): bool
    {
        return $this->user()?->can('create', Product::class) ?? false;
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
        return $this->productComboRules($this->user()?->current_manufacturer_id);
    }

    public function messages(): array
    {
        return $this->productComboMessages();
    }

    public function withValidator(Validator $validator): void
    {
        $this->productComboAfterValidation($validator);
    }
}
