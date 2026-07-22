<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreRepresentativeInvitationRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->isManufacturerUser() === true;
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
            'email' => ['required', 'string', 'lowercase', 'email:rfc', 'max:255'],
            'whatsapp' => ['nullable', 'string', 'max:30'],
            'personal_message' => ['nullable', 'string', 'max:1500'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'email' => strtolower(trim((string) $this->input('email'))),
        ]);
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Informe o nome do representante.',
            'email.required' => 'Informe o e-mail que receberá o convite.',
            'email.email' => 'Informe um e-mail válido.',
            'personal_message.max' => 'A mensagem pessoal pode ter até 1.500 caracteres.',
        ];
    }
}
