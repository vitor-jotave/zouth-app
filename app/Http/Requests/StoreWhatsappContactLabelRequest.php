<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreWhatsappContactLabelRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:40'],
            'color' => ['required', 'string', 'regex:/^#[0-9a-fA-F]{6}$/D'],
        ];
    }

    public function messages(): array
    {
        return ['name.required' => 'Informe o nome da etiqueta.', 'name.max' => 'Use até 40 caracteres.', 'color.regex' => 'Selecione uma cor válida.'];
    }
}
