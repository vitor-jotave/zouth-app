<?php

namespace App\Http\Requests;

use App\Models\ProductCategory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ProductCategoryStoreRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('create', ProductCategory::class) ?? false;
    }

    protected function prepareForValidation(): void
    {
        if ($this->filled('name')) {
            $this->merge([
                'slug' => Str::slug($this->input('name')),
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
        $manufacturerId = $this->user()?->current_manufacturer_id;

        return [
            'name' => ['required', 'string', 'max:255'],
            'slug' => [
                'required',
                'string',
                'max:255',
                Rule::unique('product_categories', 'slug')
                    ->where('manufacturer_id', $manufacturerId),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'O nome da categoria e obrigatorio.',
            'slug.unique' => 'Ja existe uma categoria com esse nome.',
        ];
    }
}
