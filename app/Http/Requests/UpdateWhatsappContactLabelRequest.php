<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateWhatsappContactLabelRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return ['assigned' => ['required', 'boolean']];
    }

    public function messages(): array
    {
        return ['assigned.*' => 'Escolha se a etiqueta deve ser aplicada ao contato.'];
    }
}
