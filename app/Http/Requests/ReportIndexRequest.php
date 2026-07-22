<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReportIndexRequest extends FormRequest
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
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return [
            'period' => [
                'nullable',
                'string',
                Rule::in(['7_days', '30_days', '90_days', 'current_month', 'current_year', 'custom']),
            ],
            'start' => [
                Rule::requiredIf($this->string('period')->toString() === 'custom'),
                'nullable',
                'date_format:Y-m-d',
                'before_or_equal:end',
            ],
            'end' => [
                Rule::requiredIf($this->string('period')->toString() === 'custom'),
                'nullable',
                'date_format:Y-m-d',
                'after_or_equal:start',
                'before_or_equal:today',
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'period.in' => 'Escolha um período disponível.',
            'start.required' => 'Informe o início do período personalizado.',
            'start.before_or_equal' => 'O início precisa ser anterior ao fim do período.',
            'end.required' => 'Informe o fim do período personalizado.',
            'end.after_or_equal' => 'O fim precisa ser posterior ao início do período.',
            'end.before_or_equal' => 'O período não pode terminar no futuro.',
        ];
    }
}
