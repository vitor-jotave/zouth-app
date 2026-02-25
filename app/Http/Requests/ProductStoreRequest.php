<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ProductValidationRules;
use App\Models\Product;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class ProductStoreRequest extends FormRequest
{
    use ProductValidationRules;

    public function authorize(): bool
    {
        return $this->user()?->can('create', Product::class) ?? false;
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

        return $this->productRules($manufacturerId);
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
