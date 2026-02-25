<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CatalogSettingBackgroundRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->current_manufacturer_id !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'background_image' => [
                'required',
                'image',
                'mimes:jpeg,jpg,png,webp',
                'max:5120', // 5MB
            ],
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'background_image.required' => 'Selecione uma imagem de fundo.',
            'background_image.image' => 'O arquivo deve ser uma imagem.',
            'background_image.mimes' => 'A imagem deve ser do tipo: jpeg, jpg, png ou webp.',
            'background_image.max' => 'A imagem nao pode ser maior que 5MB.',
        ];
    }
}
