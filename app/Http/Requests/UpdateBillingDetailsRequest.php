<?php

namespace App\Http\Requests;

use App\Models\Manufacturer;
use App\Rules\Cnpj;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateBillingDetailsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->isManufacturerOwner() ?? false;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('cnpj')) {
            $this->merge(['cnpj' => preg_replace('/\D/', '', (string) $this->input('cnpj'))]);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $manufacturerId = $this->user()?->current_manufacturer_id;

        return [
            'cnpj' => [
                'required',
                'string',
                new Cnpj,
                Rule::unique(Manufacturer::class, 'cnpj')->ignore($manufacturerId),
            ],
            'phone' => ['required', 'string', 'max:20'],
            'zip_code' => ['required', 'string', 'max:9'],
            'state' => ['required', 'string', 'size:2'],
            'city' => ['required', 'string', 'max:100'],
            'neighborhood' => ['required', 'string', 'max:100'],
            'street' => ['required', 'string', 'max:255'],
            'address_number' => ['required', 'string', 'max:20'],
            'complement' => ['nullable', 'string', 'max:100'],
        ];
    }
}
