<?php

namespace App\Http\Requests\Admin;

use App\Models\Manufacturer;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDemoShowroomRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->isSuperadmin() === true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $demoOwnerId = Manufacturer::query()
            ->where('is_demo', true)
            ->value('primary_owner_user_id');

        return [
            'email' => [
                'required',
                'string',
                'lowercase',
                'email:rfc',
                'max:255',
                Rule::unique('users', 'email')->ignore($demoOwnerId),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'email.required' => 'Informe o e-mail que será usado nas apresentações.',
            'email.email' => 'Informe um e-mail válido.',
            'email.unique' => 'Este e-mail já pertence a outra conta da Zouth.',
        ];
    }
}
