<?php

namespace App\Http\Requests;

use App\Models\CatalogSetting;
use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StorePublicOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'customer_name' => ['required', 'string', 'max:255'],
            'customer_phone' => ['nullable', 'string', 'max:20', 'regex:/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/'],
            'customer_email' => ['nullable', 'email', 'max:255'],
            'customer_notes' => ['nullable', 'string', 'max:2000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:9999'],
            'items.*.size' => ['nullable', 'string', 'max:10'],
            'items.*.color' => ['nullable', 'string', 'max:50'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            // Require at least phone or email
            if (empty($this->customer_phone) && empty($this->customer_email)) {
                $validator->errors()->add('customer_phone', 'Informe pelo menos telefone ou e-mail.');
                $validator->errors()->add('customer_email', 'Informe pelo menos telefone ou e-mail.');
            }

            // Ensure all product_ids belong to this manufacturer
            $setting = $this->route('catalogSetting');

            if ($setting instanceof CatalogSetting) {
                $manufacturerId = $setting->manufacturer_id;
                $productIds = collect($this->items)->pluck('product_id')->unique();

                $validCount = Product::whereIn('id', $productIds)
                    ->where('manufacturer_id', $manufacturerId)
                    ->where('is_active', true)
                    ->count();

                if ($validCount !== $productIds->count()) {
                    $validator->errors()->add('items', 'Um ou mais produtos sao invalidos para este catalogo.');
                }
            }
        });
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'customer_name.required' => 'O nome e obrigatorio.',
            'customer_phone.regex' => 'Formato de telefone invalido. Use (XX) XXXXX-XXXX.',
            'customer_email.email' => 'E-mail invalido.',
            'items.required' => 'Adicione pelo menos um produto ao pedido.',
            'items.min' => 'Adicione pelo menos um produto ao pedido.',
            'items.*.product_id.required' => 'Produto invalido.',
            'items.*.product_id.exists' => 'Produto nao encontrado.',
            'items.*.quantity.required' => 'Quantidade obrigatoria.',
            'items.*.quantity.min' => 'Quantidade minima e 1.',
        ];
    }
}
