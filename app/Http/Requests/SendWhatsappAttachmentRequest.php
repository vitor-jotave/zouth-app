<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SendWhatsappAttachmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'attachment' => ['required', 'file', 'min:0.001', 'max:20480'],
            'recorded' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'attachment.required' => 'Selecione um arquivo para enviar.',
            'attachment.file' => 'O arquivo não é válido.',
            'attachment.min' => 'O arquivo está vazio.',
            'attachment.max' => 'Selecione um arquivo de até 20 MB.',
        ];
    }
}
