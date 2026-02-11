<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CatalogSettingUpdateRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $this->merge([
            'public_link_active' => $this->boolean('public_link_active'),
        ]);
    }

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
            'brand_name' => ['required', 'string', 'max:80'],
            'tagline' => ['nullable', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:600'],
            'primary_color' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'secondary_color' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'accent_color' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'background_color' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'font_family' => ['required', 'in:space-grotesk,fraunces,ibm-plex'],
            'public_link_active' => ['required', 'boolean'],

            // Premium customization
            'layout_preset' => ['sometimes', 'in:minimal,playful,boutique'],
            'layout_density' => ['sometimes', 'in:comfortable,compact'],
            'card_style' => ['sometimes', 'in:flat,soft'],
            'background_mode' => ['sometimes', 'in:solid,image,pattern,gradient'],
            'background_image_opacity' => ['sometimes', 'integer', 'min:0', 'max:100'],
            'background_overlay_color' => ['sometimes', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'background_overlay_opacity' => ['sometimes', 'integer', 'min:0', 'max:100'],
            'background_blur' => ['sometimes', 'integer', 'min:0', 'max:12'],
            'pattern_id' => ['nullable', 'in:confetti,stars,clouds,dots'],
            'pattern_color' => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'pattern_opacity' => ['sometimes', 'integer', 'min:0', 'max:100'],
            'gradient_id' => ['nullable', 'in:sunset,soft-sky,mint,ocean,lavender,peach'],
            'sections' => ['sometimes', 'array'],
            'sections.*.type' => ['required', 'in:hero,collections,product_grid'],
            'sections.*.enabled' => ['required', 'boolean'],
            'sections.*.props' => ['sometimes', 'array'],
        ];
    }

    public function messages(): array
    {
        return [
            'brand_name.required' => 'O nome da marca e obrigatorio.',
            'brand_name.max' => 'O nome da marca deve ter no maximo 80 caracteres.',
            'tagline.max' => 'O slogan deve ter no maximo 120 caracteres.',
            'description.max' => 'A descricao deve ter no maximo 600 caracteres.',
            'primary_color.regex' => 'A cor primaria deve estar no formato #RRGGBB.',
            'secondary_color.regex' => 'A cor secundaria deve estar no formato #RRGGBB.',
            'accent_color.regex' => 'A cor de destaque deve estar no formato #RRGGBB.',
            'background_color.regex' => 'A cor de fundo deve estar no formato #RRGGBB.',
            'font_family.in' => 'A fonte selecionada e invalida.',
        ];
    }
}
