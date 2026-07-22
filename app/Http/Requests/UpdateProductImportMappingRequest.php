<?php

namespace App\Http\Requests;

use App\Models\ProductImport;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductImportMappingRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $productImport = $this->route('productImport');

        return $productImport instanceof ProductImport
            && ($this->user()?->can('update', $productImport) ?? false);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var ProductImport|null $productImport */
        $productImport = $this->route('productImport');
        $headers = $productImport?->headers ?? [];

        return [
            'mapping' => ['required', 'array'],
            'mapping.sku' => ['required', 'string', Rule::in($headers)],
            'mapping.name' => ['nullable', 'string', Rule::in($headers)],
            'mapping.description' => ['nullable', 'string', Rule::in($headers)],
            'mapping.category' => ['nullable', 'string', Rule::in($headers)],
            'mapping.is_active' => ['nullable', 'string', Rule::in($headers)],
            'mapping.price' => ['nullable', 'string', Rule::in($headers)],
            'mapping.stock' => ['nullable', 'string', Rule::in($headers)],
            'mapping.variant_sku' => ['nullable', 'string', Rule::in($headers)],
            'mapping.variant_price' => ['nullable', 'string', Rule::in($headers)],
            'mapping.variant_stock' => ['nullable', 'string', Rule::in($headers)],
            'mapping.variation_type_1' => ['nullable', 'string', Rule::in($headers)],
            'mapping.variation_value_1' => ['nullable', 'string', Rule::in($headers)],
            'mapping.variation_type_2' => ['nullable', 'string', Rule::in($headers)],
            'mapping.variation_value_2' => ['nullable', 'string', Rule::in($headers)],
            'mapping.variation_type_3' => ['nullable', 'string', Rule::in($headers)],
            'mapping.variation_value_3' => ['nullable', 'string', Rule::in($headers)],
            'mapping.image_url_1' => ['nullable', 'string', Rule::in($headers)],
            'mapping.image_url_2' => ['nullable', 'string', Rule::in($headers)],
            'mapping.image_url_3' => ['nullable', 'string', Rule::in($headers)],
            'mapping.image_url_4' => ['nullable', 'string', Rule::in($headers)],
            'mapping.image_url_5' => ['nullable', 'string', Rule::in($headers)],
            'mapping_name' => ['nullable', 'string', 'max:80'],
        ];
    }

    public function messages(): array
    {
        return [
            'mapping.sku.required' => 'Diga qual coluna contém o SKU principal.',
            'mapping.*.in' => 'Uma das colunas relacionadas não existe mais na planilha.',
        ];
    }
}
