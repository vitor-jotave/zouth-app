<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePlanRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->isSuperadmin() ?? false;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'monthly_price' => $this->normalizePrice($this->input('monthly_price')),
        ]);
    }

    /**
     * Normalize price input: accept comma or dot as decimal separator.
     */
    private function normalizePrice(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return str_replace(',', '.', (string) $value);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['boolean'],
            'sort_order' => ['integer', 'min:0'],
            'monthly_price' => ['required', 'numeric', 'min:0'],
            'trial_days' => ['integer', 'min:0'],
            'max_reps' => ['nullable', 'integer', 'min:1'],
            'max_products' => ['nullable', 'integer', 'min:1'],
            'max_orders_per_month' => ['nullable', 'integer', 'min:1'],
            'max_users' => ['nullable', 'integer', 'min:1'],
            'max_data_mb' => ['nullable', 'integer', 'min:1'],
            'max_files_gb' => ['nullable', 'integer', 'min:1'],
            'allow_csv_import' => ['boolean'],
        ];
    }

    /**
     * Get the monthly price in cents.
     */
    public function monthlyPriceCents(): int
    {
        return (int) round((float) $this->validated('monthly_price') * 100);
    }
}
