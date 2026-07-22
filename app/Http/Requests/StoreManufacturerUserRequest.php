<?php

namespace App\Http\Requests;

use App\Enums\ManufacturerCapability;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreManufacturerUserRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->isManufacturerOwner() ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'role' => ['required', Rule::in(['owner', 'staff'])],
            'capabilities' => [
                Rule::requiredIf($this->string('role')->toString() === 'staff'),
                'array',
                Rule::when($this->string('role')->toString() === 'staff', ['min:1']),
            ],
            'capabilities.*' => ['string', 'distinct', Rule::in(ManufacturerCapability::values())],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Informe o nome da pessoa.',
            'email.required' => 'Informe o e-mail da pessoa.',
            'email.email' => 'Informe um e-mail válido.',
            'email.unique' => 'Este e-mail já está em uso.',
            'role.required' => 'Escolha a função da pessoa.',
            'capabilities.required' => 'Escolha ao menos uma área para a pessoa cuidar.',
            'capabilities.min' => 'Escolha ao menos uma área para a pessoa cuidar.',
            'capabilities.*.in' => 'Uma das áreas selecionadas não é válida.',
        ];
    }
}
