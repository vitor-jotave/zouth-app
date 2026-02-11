<?php

namespace App\Http\Requests;

use App\Models\Manufacturer;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class StoreManufacturerRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('create', Manufacturer::class) ?? false;
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Auto-generate slug from name if not provided
        if (! $this->has('slug') && $this->has('manufacturer_name')) {
            $this->merge([
                'slug' => Str::slug($this->manufacturer_name),
            ]);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'manufacturer_name' => ['required', 'string', 'max:255'],
            'slug' => ['sometimes', 'string', 'max:255', Rule::unique('manufacturers', 'slug')],
            'owner_name' => ['required', 'string', 'max:255'],
            'owner_email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
        ];
    }

    /**
     * Get custom attribute names for validator errors.
     */
    public function attributes(): array
    {
        return [
            'manufacturer_name' => 'manufacturer name',
            'owner_name' => 'owner name',
            'owner_email' => 'owner email',
        ];
    }
}
