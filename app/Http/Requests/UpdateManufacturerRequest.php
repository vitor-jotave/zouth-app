<?php

namespace App\Http\Requests;

use App\Models\Manufacturer;
use App\Rules\Cnpj;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateManufacturerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('manufacturer')) ?? false;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('cnpj')) {
            $this->merge(['cnpj' => preg_replace('/\D/', '', (string) $this->cnpj)]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var Manufacturer $manufacturer */
        $manufacturer = $this->route('manufacturer');

        return [
            'name' => ['required', 'string', 'max:255'],
            'cnpj' => ['required', 'string', new Cnpj, Rule::unique('manufacturers', 'cnpj')->ignore($manufacturer->id)],
            'phone' => ['required', 'string', 'max:20'],
            'logo' => ['nullable', 'image', 'max:2048'],
            'remove_logo' => ['nullable', 'boolean'],
            'zip_code' => ['nullable', 'string', 'max:9'],
            'state' => ['nullable', 'string', 'size:2'],
            'city' => ['nullable', 'string', 'max:100'],
            'neighborhood' => ['nullable', 'string', 'max:100'],
            'street' => ['nullable', 'string', 'max:255'],
            'address_number' => ['nullable', 'string', 'max:20'],
            'complement' => ['nullable', 'string', 'max:100'],
        ];
    }

    public function attributes(): array
    {
        return [
            'name' => 'nome do fabricante',
            'cnpj' => 'CNPJ',
            'phone' => 'telefone',
            'zip_code' => 'CEP',
            'state' => 'estado',
            'city' => 'cidade',
            'neighborhood' => 'bairro',
            'street' => 'logradouro',
            'address_number' => 'número',
            'complement' => 'complemento',
        ];
    }
}
