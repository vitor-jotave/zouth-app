<?php

namespace App\Http\Requests;

use App\Enums\ProductSize;
use App\Models\Product;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductStoreRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('create', Product::class) ?? false;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'has_size_variants' => $this->boolean('has_size_variants'),
            'has_color_variants' => $this->boolean('has_color_variants'),
            'sizes' => $this->input('sizes', []),
            'colors' => $this->input('colors', []),
            'variant_stocks' => $this->input('variant_stocks', []),
        ]);
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
            'sku' => [
                'required',
                'string',
                'max:255',
                Rule::unique('products', 'sku')
                    ->where('manufacturer_id', $manufacturerId),
            ],
            'description' => ['nullable', 'string'],
            'product_category_id' => [
                'nullable',
                'integer',
                Rule::exists('product_categories', 'id')
                    ->where('manufacturer_id', $manufacturerId),
            ],
            'has_size_variants' => ['required', 'boolean'],
            'has_color_variants' => ['required', 'boolean'],
            'base_quantity' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer'],
            'sizes' => ['array'],
            'sizes.*' => ['distinct', Rule::enum(ProductSize::class)],
            'colors' => ['array'],
            'colors.*.name' => ['required', 'string', 'max:50', 'distinct'],
            'colors.*.hex' => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'variant_stocks' => ['array'],
            'variant_stocks.*.size' => ['nullable', Rule::enum(ProductSize::class)],
            'variant_stocks.*.color_name' => ['nullable', 'string', 'max:50'],
            'variant_stocks.*.quantity' => ['required', 'integer', 'min:0'],
            'variant_stocks.*.sku_variant' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'O nome do produto e obrigatorio.',
            'sku.required' => 'O SKU e obrigatorio.',
            'sku.unique' => 'Este SKU ja esta em uso neste fabricante.',
            'product_category_id.exists' => 'A categoria informada nao pertence a este fabricante.',
            'colors.*.name.required' => 'O nome da cor e obrigatorio.',
            'colors.*.name.distinct' => 'As cores nao podem se repetir.',
            'sizes.*.distinct' => 'Os tamanhos nao podem se repetir.',
            'variant_stocks.*.quantity.required' => 'Informe a quantidade de estoque para cada variacao.',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $hasSizes = $this->boolean('has_size_variants');
            $hasColors = $this->boolean('has_color_variants');
            $sizes = collect($this->input('sizes', []))->filter()->values();
            $colors = collect($this->input('colors', []))
                ->pluck('name')
                ->filter()
                ->values();
            $stocks = collect($this->input('variant_stocks', []));

            if (! $hasSizes && ! $hasColors) {
                if ($this->input('base_quantity') === null) {
                    $validator->errors()->add('base_quantity', 'Informe a quantidade base do produto.');
                }

                if ($sizes->isNotEmpty() || $colors->isNotEmpty() || $stocks->isNotEmpty()) {
                    $validator->errors()->add('variant_stocks', 'Nao envie variacoes quando o produto nao tem tamanhos ou cores.');
                }

                return;
            }

            if ((int) $this->input('base_quantity', 0) > 0) {
                $validator->errors()->add('base_quantity', 'A quantidade base deve ser zero quando ha variacoes.');
            }

            if ($hasSizes && $sizes->isEmpty()) {
                $validator->errors()->add('sizes', 'Selecione pelo menos um tamanho.');
            }

            if (! $hasSizes && $sizes->isNotEmpty()) {
                $validator->errors()->add('sizes', 'Tamanhos nao devem ser enviados quando desativados.');
            }

            if ($hasColors && $colors->isEmpty()) {
                $validator->errors()->add('colors', 'Informe pelo menos uma cor.');
            }

            if (! $hasColors && $colors->isNotEmpty()) {
                $validator->errors()->add('colors', 'Cores nao devem ser enviadas quando desativadas.');
            }

            if ($hasSizes || $hasColors) {
                if ($stocks->isEmpty()) {
                    $validator->errors()->add('variant_stocks', 'Informe o estoque de todas as variacoes.');
                    return;
                }
            }

            $expectedKeys = collect();

            if ($hasSizes && ! $hasColors) {
                $expectedKeys = $sizes->map(fn (string $size) => $size.'|');
            }

            if (! $hasSizes && $hasColors) {
                $expectedKeys = $colors->map(fn (string $color) => '|'.$color);
            }

            if ($hasSizes && $hasColors) {
                $expectedKeys = $sizes->flatMap(fn (string $size) => $colors->map(fn (string $color) => $size.'|'.$color));
            }

            $providedKeys = $stocks->map(function (array $stock) {
                $size = $stock['size'] ?? '';
                $color = $stock['color_name'] ?? '';

                return $size.'|'.$color;
            });

            if ($hasSizes) {
                $invalidSize = $stocks->first(fn (array $stock) => empty($stock['size']));

                if ($invalidSize) {
                    $validator->errors()->add('variant_stocks', 'Todas as variacoes devem informar o tamanho.');
                }
            }

            if ($hasColors) {
                $invalidColor = $stocks->first(fn (array $stock) => empty($stock['color_name']));

                if ($invalidColor) {
                    $validator->errors()->add('variant_stocks', 'Todas as variacoes devem informar a cor.');
                }
            }

            if (! $hasSizes) {
                $sizeFilled = $stocks->first(fn (array $stock) => ! empty($stock['size']));

                if ($sizeFilled) {
                    $validator->errors()->add('variant_stocks', 'Nao envie tamanhos quando a variacao de tamanho estiver desativada.');
                }
            }

            if (! $hasColors) {
                $colorFilled = $stocks->first(fn (array $stock) => ! empty($stock['color_name']));

                if ($colorFilled) {
                    $validator->errors()->add('variant_stocks', 'Nao envie cores quando a variacao de cor estiver desativada.');
                }
            }

            $unknownColors = $stocks
                ->pluck('color_name')
                ->filter()
                ->diff($colors);

            if ($unknownColors->isNotEmpty()) {
                $validator->errors()->add('variant_stocks', 'As variacoes informam cores que nao foram cadastradas.');
            }

            $missing = $expectedKeys->diff($providedKeys->unique());

            if ($missing->isNotEmpty()) {
                $validator->errors()->add('variant_stocks', 'Faltam combinacoes de variacao obrigatorias.');
            }

            if ($providedKeys->unique()->count() !== $providedKeys->count()) {
                $validator->errors()->add('variant_stocks', 'Nao envie combinacoes duplicadas de variacao.');
            }
        });
    }
}
