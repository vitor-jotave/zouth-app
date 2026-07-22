<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreRepresentativeApplicationRequest extends FormRequest
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
            'application_note' => ['required', 'string', 'min:20', 'max:1500'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'state' => strtoupper((string) $this->input('state')),
        ]);
    }

    public function messages(): array
    {
        return [
            'whatsapp.required' => 'Informe seu WhatsApp comercial.',
            'city.required' => 'Informe sua cidade.',
            'state.size' => 'Use a sigla do estado com duas letras.',
            'territory.required' => 'Conte em qual território você atua.',
            'presentation.min' => 'Sua apresentação precisa ter pelo menos 30 caracteres.',
            'application_note.min' => 'Conte em poucas palavras por que essa coleção combina com sua carteira.',
        ];
    }
}
