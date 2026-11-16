<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateRepresentativeProfileRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->isSalesRep() === true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'whatsapp' => ['required', 'string', 'max:30'],
            'city' => ['required', 'string', 'max:120'],
            'state' => ['required', 'string', 'size:2'],
            'territory' => ['required', 'string', 'max:255'],
            'presentation' => ['required', 'string', 'min:30', 'max:2000'],
        ];
    }

    public function messages(): array
    {
        return [
            'whatsapp.required' => 'Informe seu WhatsApp comercial.',
            'city.required' => 'Informe sua cidade.',
            'state.required' => 'Informe sua UF.',
            'state.size' => 'Use a sigla do estado com duas letras.',
            'territory.required' => 'Conte em qual território você atua.',
            'presentation.required' => 'Escreva sua apresentação comercial.',
            'presentation.min' => 'Sua apresentação precisa ter pelo menos 30 caracteres.',
        ];
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('state'))) {
            $this->merge(['state' => strtoupper($this->input('state'))]);
        }
    }
}
