<?php

namespace App\Http\Requests;

use App\Models\Manufacturer;
use App\Rules\Cnpj;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class StoreManufacturerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Manufacturer::class) ?? false;
    }

    protected function prepareForValidation(): void
    {
        if (! $this->has('slug') && $this->has('manufacturer_name')) {
            $this->merge(['slug' => Str::slug($this->manufacturer_name)]);
        }

        if ($this->has('cnpj')) {
            $this->merge(['cnpj' => preg_replace('/\D/', '', (string) $this->cnpj)]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'manufacturer_name' => ['required', 'string', 'max:255'],
            'slug' => ['sometimes', 'string', 'max:255', Rule::unique('manufacturers', 'slug')],
            'cnpj' => ['required', 'string', new Cnpj, Rule::unique('manufacturers', 'cnpj')],
            'phone' => ['required', 'string', 'max:20'],
            'logo' => ['nullable', 'image', 'max:2048'],
            'zip_code' => ['nullable', 'string', 'max:9'],
            'state' => ['nullable', 'string', 'size:2'],
            'city' => ['nullable', 'string', 'max:100'],
            'neighborhood' => ['nullable', 'string', 'max:100'],
            'street' => ['nullable', 'string', 'max:255'],
            'address_number' => ['nullable', 'string', 'max:20'],
            'complement' => ['nullable', 'string', 'max:100'],
            'owner_name' => ['required', 'string', 'max:255'],
            'owner_email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'owner_temporary_password' => ['nullable', 'string', 'min:12', 'max:255'],
        ];
    }

    public function attributes(): array
    {
        return [
            'manufacturer_name' => 'nome do fabricante',
            'cnpj' => 'CNPJ',
            'phone' => 'telefone',
            'zip_code' => 'CEP',
            'state' => 'estado',
            'city' => 'cidade',
            'neighborhood' => 'bairro',
            'street' => 'logradouro',
            'address_number' => 'número',
            'complement' => 'complemento',
            'owner_name' => 'nome do responsável',
            'owner_email' => 'e-mail do responsável',
            'owner_temporary_password' => 'senha temporária',
        ];
    }
}
