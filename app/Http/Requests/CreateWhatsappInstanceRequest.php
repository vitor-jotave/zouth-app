<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateWhatsappInstanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isManufacturerUser();
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'instance_name' => ['required', 'string', 'max:100', 'regex:/^[a-zA-Z0-9_-]+$/', 'unique:whatsapp_instances,instance_name'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'instance_name.required' => 'O nome da instância é obrigatório.',
            'instance_name.regex' => 'O nome da instância deve conter apenas letras, números, hífens e underscores.',
            'instance_name.unique' => 'Já existe uma instância com esse nome.',
        ];
    }
}
