<?php

namespace App\Http\Requests;

class StoreRepresentativeApplicationRequest extends UpdateRepresentativeProfileRequest
{
    public function rules(): array
    {
        return parent::rules() + [
            'application_note' => ['required', 'string', 'min:20', 'max:1500'],
        ];
    }

    public function messages(): array
    {
        return parent::messages() + [
            'application_note.min' => 'Conte em poucas palavras por que essa coleção combina com sua carteira.',
        ];
    }
}
