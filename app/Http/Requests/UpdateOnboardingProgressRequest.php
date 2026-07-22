<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateOnboardingProgressRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'step' => ['required', 'integer', 'between:1,3'],
            'brand_name' => ['nullable', 'string', 'min:2', 'max:120'],
            'selling_method' => ['nullable', Rule::in(['pdf_whatsapp', 'representatives', 'direct_retailers', 'mixed'])],
        ];
    }
}
