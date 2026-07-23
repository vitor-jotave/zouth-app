<?php

namespace App\Http\Requests;

use App\Models\CatalogSetting;
use App\Models\Product;
use App\Rules\Cnpj;
use App\Rules\Cpf;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
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
        $isQuoteRequest = $this->boolean('request_quote');
        $documentRule = $this->input('customer_document_type') === 'cnpj'
            ? new Cnpj
            : new Cpf;

        return [
            'request_quote' => ['sometimes', 'boolean'],
            'customer_name' => ['required', 'string', 'max:255'],
            'customer_phone' => ['nullable', 'string', 'max:20', 'regex:/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/'],
            'customer_email' => ['nullable', 'email', 'max:255'],
            'customer_document_type' => [Rule::requiredIf(! $isQuoteRequest), 'nullable', 'string', 'in:cpf,cnpj'],
            'customer_document' => [Rule::requiredIf(! $isQuoteRequest), 'nullable', 'string', $documentRule],
            'customer_notes' => ['nullable', 'string', 'max:2000'],
            'customer_zip_code' => [Rule::requiredIf(! $isQuoteRequest), 'nullable', 'string', 'size:8'],
            'customer_state' => [Rule::requiredIf(! $isQuoteRequest), 'nullable', 'string', 'size:2'],
            'customer_city' => [Rule::requiredIf(! $isQuoteRequest), 'nullable', 'string', 'max:255'],
            'customer_neighborhood' => [Rule::requiredIf(! $isQuoteRequest), 'nullable', 'string', 'max:255'],
            'customer_street' => [Rule::requiredIf(! $isQuoteRequest), 'nullable', 'string', 'max:255'],
            'customer_address_number' => [Rule::requiredIf(! $isQuoteRequest), 'nullable', 'string', 'max:20'],
            'customer_address_complement' => ['nullable', 'string', 'max:255'],
            'customer_address_reference' => ['nullable', 'string', 'max:255'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:9999'],
            'items.*.size' => ['nullable', 'string', 'max:10'],
            'items.*.color' => ['nullable', 'string', 'max:50'],
            'items.*.selected_variations' => ['nullable', 'array', 'max:20'],
            'items.*.selected_variations.*' => ['required', 'string', 'max:100'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'request_quote' => $this->boolean('request_quote'),
            'customer_document_type' => $this->filled('customer_document_type')
                ? strtolower((string) $this->input('customer_document_type'))
                : null,
            'customer_document' => $this->filled('customer_document')
                ? preg_replace('/\D/', '', (string) $this->input('customer_document'))
                : null,
            'customer_zip_code' => $this->filled('customer_zip_code')
                ? preg_replace('/\D/', '', (string) $this->input('customer_zip_code'))
                : null,
            'customer_state' => $this->filled('customer_state')
                ? strtoupper((string) $this->input('customer_state'))
                : null,
        ]);
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
            'customer_document_type.required' => 'Selecione pessoa fisica ou juridica.',
            'customer_document_type.in' => 'Selecione pessoa fisica ou juridica.',
            'customer_document.required' => 'Informe o documento.',
            'customer_zip_code.required' => 'Informe o CEP.',
            'customer_zip_code.size' => 'O CEP deve conter 8 digitos.',
            'customer_state.required' => 'Informe a UF.',
            'customer_state.size' => 'A UF deve conter 2 letras.',
            'customer_city.required' => 'Informe a cidade.',
            'customer_neighborhood.required' => 'Informe o bairro.',
            'customer_street.required' => 'Informe a rua.',
            'customer_address_number.required' => 'Informe o numero.',
            'items.required' => 'Adicione pelo menos um produto ao pedido.',
            'items.min' => 'Adicione pelo menos um produto ao pedido.',
            'items.*.product_id.required' => 'Produto invalido.',
            'items.*.product_id.exists' => 'Produto nao encontrado.',
            'items.*.quantity.required' => 'Quantidade obrigatoria.',
            'items.*.quantity.min' => 'Quantidade minima e 1.',
        ];
    }
}
