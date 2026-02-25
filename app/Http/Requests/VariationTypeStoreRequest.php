<?php

namespace App\Http\Requests;

use App\Models\VariationType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class VariationTypeStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', VariationType::class) ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $manufacturerId = $this->user()?->current_manufacturer_id;

        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('variation_types', 'name')
                    ->where('manufacturer_id', $manufacturerId),
            ],
            'is_color_type' => ['sometimes', 'boolean'],
            'values' => ['array'],
            'values.*.value' => ['required', 'string', 'max:100'],
            'values.*.hex' => ['nullable', 'string', 'max:7'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'name.required' => 'O nome do tipo de variação é obrigatório.',
            'name.unique' => 'Já existe um tipo de variação com esse nome.',
            'values.*.value.required' => 'O valor da variação é obrigatório.',
        ];
    }
}
