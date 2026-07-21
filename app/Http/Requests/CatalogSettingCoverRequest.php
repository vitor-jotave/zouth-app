<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class CatalogSettingCoverRequest extends FormRequest
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
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'cover_image' => [
                'required',
                'image',
                'mimes:jpeg,jpg,png,webp',
                'max:8192',
            ],
            'cover_image_focal_x' => ['sometimes', 'integer', 'min:0', 'max:100'],
            'cover_image_focal_y' => ['sometimes', 'integer', 'min:0', 'max:100'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'cover_image.required' => 'Selecione uma imagem para a capa.',
            'cover_image.image' => 'O arquivo da capa deve ser uma imagem.',
            'cover_image.mimes' => 'A capa deve ser do tipo: jpeg, jpg, png ou webp.',
            'cover_image.max' => 'A imagem da capa nao pode ser maior que 8MB.',
            'cover_image_focal_x.min' => 'O foco horizontal deve estar entre 0 e 100.',
            'cover_image_focal_x.max' => 'O foco horizontal deve estar entre 0 e 100.',
            'cover_image_focal_y.min' => 'O foco vertical deve estar entre 0 e 100.',
            'cover_image_focal_y.max' => 'O foco vertical deve estar entre 0 e 100.',
        ];
    }
}
