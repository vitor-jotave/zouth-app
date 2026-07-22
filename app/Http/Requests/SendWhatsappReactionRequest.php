<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SendWhatsappReactionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'reaction' => [
                'required',
                'string',
                Rule::in([
                    '👍',
                    '❤️',
                    '😂',
                    '😮',
                    '😢',
                    '🙏',
                    '👏',
                    '🔥',
                    '🎉',
                    '😍',
                    '🤔',
                    '🤝',
                ]),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'reaction.required' => 'Escolha uma reação.',
            'reaction.in' => 'Essa reação não está disponível.',
        ];
    }
}
