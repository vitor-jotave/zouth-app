<?php

namespace App\Http\Requests;

use App\Enums\WhatsappInstanceStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class CatalogSettingUpdateRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if ($this->has('public_link_active')) {
            $this->merge([
                'public_link_active' => $this->boolean('public_link_active'),
            ]);
        }

        if ($this->has('show_brand_name')) {
            $this->merge([
                'show_brand_name' => $this->boolean('show_brand_name'),
            ]);
        }

        if ($this->has('show_logo')) {
            $this->merge([
                'show_logo' => $this->boolean('show_logo'),
            ]);
        }

        if ($this->has('hide_prices')) {
            $this->merge([
                'hide_prices' => $this->boolean('hide_prices'),
            ]);
        }
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
            'show_brand_name' => ['sometimes', 'boolean'],
            'show_logo' => ['sometimes', 'boolean'],
            'hide_prices' => ['sometimes', 'boolean'],
            'tagline' => ['nullable', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:600'],
            'primary_color' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'secondary_color' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'accent_color' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'background_color' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'font_family' => ['required', 'in:sora,manrope,space-grotesk,fraunces,ibm-plex'],
            'heading_font_family' => ['sometimes', 'nullable', 'in:sora,manrope,space-grotesk,fraunces,ibm-plex'],
            'body_font_family' => ['sometimes', 'nullable', 'in:sora,manrope,space-grotesk,fraunces,ibm-plex'],
            'cover_image_focal_x' => ['sometimes', 'integer', 'min:0', 'max:100'],
            'cover_image_focal_y' => ['sometimes', 'integer', 'min:0', 'max:100'],
            'public_link_active' => ['required', 'boolean'],

            // Premium customization
            'layout_preset' => ['sometimes', 'in:minimal'],
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
            'heading_font_family.in' => 'A fonte de titulos selecionada e invalida.',
            'body_font_family.in' => 'A fonte de corpo selecionada e invalida.',
            'hide_prices.boolean' => 'Escolha uma forma de negociação válida.',
            'layout_density.in' => 'Escolha um respiro válido entre as peças.',
            'card_style.in' => 'Escolha um acabamento válido para as peças.',
            'background_mode.in' => 'Escolha um tipo de fundo válido.',
            'pattern_id.in' => 'Escolha um padrão de fundo válido.',
            'gradient_id.in' => 'Escolha uma combinação de cores válida.',
        ];
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if (! $this->boolean('hide_prices')) {
                    return;
                }

                $manufacturer = $this->user()?->currentManufacturer;
                $isAlreadyHidden = (bool) $manufacturer?->catalogSetting?->hide_prices;

                if ($isAlreadyHidden) {
                    return;
                }

                $connectedChannel = $manufacturer?->whatsappInstances()
                    ->where('status', WhatsappInstanceStatus::Connected->value)
                    ->whereNotNull('phone_number')
                    ->where('phone_number', '!=', '')
                    ->first();
                $phoneNumber = preg_replace('/\D/', '', (string) $connectedChannel?->phone_number);
                $hasConnectedChannel = is_string($phoneNumber)
                    && preg_match('/^\d{8,15}$/', $phoneNumber) === 1;

                if (! $hasConnectedChannel) {
                    $validator->errors()->add(
                        'hide_prices',
                        'Conecte um canal do WhatsApp antes de publicar o catálogo sem preços.',
                    );
                }
            },
        ];
    }
}
