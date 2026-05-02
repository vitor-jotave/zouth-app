<?php

namespace App\Http\Requests;

use App\Models\Customer;
use App\Rules\Cnpj;
use App\Rules\Cpf;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        $customer = $this->route('customer');

        return $customer instanceof Customer
            && ($this->user()?->can('update', $customer) ?? false);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var Customer $customer */
        $customer = $this->route('customer');
        $documentType = $this->input('customer_document_type') === 'cnpj' ? 'cnpj' : 'cpf';
        $documentRule = $documentType === 'cnpj' ? new Cnpj : new Cpf;

        return [
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:255'],
            'customer_document_type' => ['required', 'string', 'in:cpf,cnpj'],
            'customer_document' => [
                'required',
                'string',
                $documentRule,
                Rule::unique('customers', 'customer_document')
                    ->where('manufacturer_id', $customer->manufacturer_id)
                    ->where('customer_document_type', $documentType)
                    ->ignore($customer->id),
            ],
            'zip_code' => ['nullable', 'string', 'size:8'],
            'state' => ['nullable', 'string', 'size:2'],
            'city' => ['nullable', 'string', 'max:255'],
            'neighborhood' => ['nullable', 'string', 'max:255'],
            'street' => ['nullable', 'string', 'max:255'],
            'address_number' => ['nullable', 'string', 'max:20'],
            'address_complement' => ['nullable', 'string', 'max:255'],
            'address_reference' => ['nullable', 'string', 'max:255'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $zipCode = preg_replace('/\D/', '', (string) $this->input('zip_code'));
        $state = strtoupper((string) $this->input('state'));

        $this->merge([
            'customer_document_type' => strtolower((string) $this->input('customer_document_type')),
            'customer_document' => preg_replace('/\D/', '', (string) $this->input('customer_document')),
            'zip_code' => $zipCode !== '' ? $zipCode : null,
            'state' => $state !== '' ? $state : null,
        ]);
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'name' => 'nome',
            'phone' => 'telefone',
            'email' => 'e-mail',
            'customer_document_type' => 'tipo de documento',
            'customer_document' => 'documento',
            'zip_code' => 'CEP',
            'state' => 'UF',
            'city' => 'cidade',
            'neighborhood' => 'bairro',
            'street' => 'rua',
            'address_number' => 'número',
            'address_complement' => 'complemento',
            'address_reference' => 'referência',
        ];
    }
}
