<?php

namespace App\Http\Requests;

use App\Models\WhatsappQuickReply;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class UpdateWhatsappQuickReplyRequest extends FormRequest
{
    public function authorize(): bool
    {
        $quickReply = $this->route('quickReply');

        return $this->user()->isManufacturerUser()
            && $quickReply instanceof WhatsappQuickReply
            && $quickReply->manufacturer_id === $this->user()->current_manufacturer_id;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var WhatsappQuickReply $quickReply */
        $quickReply = $this->route('quickReply');

        return [
            'shortcut' => [
                'required',
                'string',
                'max:60',
                'regex:/^[\pL\pN_-]+$/u',
                Rule::unique('whatsapp_quick_replies', 'shortcut')
                    ->where('manufacturer_id', $this->user()->current_manufacturer_id)
                    ->ignore($quickReply),
            ],
            'title' => ['required', 'string', 'max:120'],
            'body' => ['required', 'string', 'max:2000'],
            'is_active' => ['required', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'shortcut.required' => 'Crie um atalho para encontrar esta mensagem no Chat.',
            'shortcut.regex' => 'Use apenas letras, números, hífen ou sublinhado no atalho.',
            'shortcut.unique' => 'Este atalho já está sendo usado.',
            'title.required' => 'Dê um nome fácil de reconhecer para a equipe.',
            'body.required' => 'Escreva a mensagem que o lead receberá.',
            'body.max' => 'A mensagem pode ter até 2.000 caracteres.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $shortcut = (string) $this->input('shortcut', '');

        $this->merge([
            'shortcut' => Str::lower(trim($shortcut, "{} \t\n\r\0\x0B")),
        ]);
    }
}
