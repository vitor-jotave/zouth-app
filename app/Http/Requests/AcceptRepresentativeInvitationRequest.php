<?php

namespace App\Http\Requests;

use App\Concerns\PasswordValidationRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class AcceptRepresentativeInvitationRequest extends FormRequest
{
    use PasswordValidationRules;

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        if ($this->user()) {
            return [];
        }

        return [
            'name' => ['required', 'string', 'max:255'],
            'password' => $this->passwordRules(),
            'terms' => ['required', 'accepted'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Informe seu nome para criar a conta.',
            'password.confirmed' => 'A confirmação da senha não confere.',
            'terms.accepted' => 'Você precisa aceitar os Termos de Uso e a Política de Privacidade.',
        ];
    }
}
