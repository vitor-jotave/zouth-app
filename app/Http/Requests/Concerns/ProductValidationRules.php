<?php

namespace App\Http\Requests\Concerns;

use App\Models\VariationType;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\File;

trait ProductValidationRules
{
    protected function productPrepareForValidation(): void
    {
        // Normalize variant stock prices from "12,90" string to integer cents
        $stocks = collect($this->input('variant_stocks', []))->map(function ($stock) {
            if (isset($stock['price']) && $stock['price'] !== null && $stock['price'] !== '') {
                $price = str_replace(',', '.', (string) $stock['price']);
                $stock['price_cents'] = (int) round(floatval($price) * 100);
            } else {
                $stock['price_cents'] = $stock['price_cents'] ?? null;
            }
            unset($stock['price']);

            return $stock;
        })->all();

        $this->merge([
            'variations' => $this->input('variations', []),
            'variant_stocks' => $stocks,
            'price' => $this->normalizePrice($this->input('price')),
        ]);
    }

    private function normalizePrice(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return str_replace(',', '.', (string) $value);
    }

    protected function productRules(?int $manufacturerId, ?int $excludeProductId = null): array
    {
        $skuRule = Rule::unique('products', 'sku')
            ->where('manufacturer_id', $manufacturerId);

        if ($excludeProductId) {
            $skuRule->ignore($excludeProductId);
        }

        return [
            'name' => ['required', 'string', 'max:255'],
            'sku' => ['required', 'string', 'max:255', $skuRule],
            'description' => ['nullable', 'string'],
            'product_category_id' => [
                'nullable',
                'integer',
                Rule::exists('product_categories', 'id')
                    ->where('manufacturer_id', $manufacturerId),
            ],
            'base_quantity' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer'],
            'price' => ['nullable', 'numeric', 'min:0', 'max:999999.99'],

            // Variations: array of { variation_type_id, values: string[] }
            'variations' => ['array'],
            'variations.*.variation_type_id' => [
                'required',
                'integer',
                Rule::exists('variation_types', 'id')
                    ->where('manufacturer_id', $manufacturerId),
            ],
            'variations.*.values' => ['required', 'array', 'min:1'],
            'variations.*.values.*' => ['required', 'string', 'max:100'],

            // Variant stocks
            'variant_stocks' => ['array'],
            'variant_stocks.*.variation_key' => ['required', 'array'],
            'variant_stocks.*.quantity' => ['required', 'integer', 'min:0'],
            'variant_stocks.*.price_cents' => ['nullable', 'integer', 'min:0'],
            'variant_stocks.*.sku_variant' => ['nullable', 'string', 'max:255'],

            // Media (optional on create)
            'images' => ['nullable', 'array', 'max:10'],
            'images.*' => [File::image()->max(5120)],
            'video' => ['nullable', File::types(['mp4', 'mov', 'webm'])->max(51200)],
        ];
    }

    protected function productMessages(): array
    {
        return [
            'name.required' => 'O nome do produto e obrigatorio.',
            'sku.required' => 'O SKU e obrigatorio.',
            'sku.unique' => 'Este SKU ja esta em uso neste fabricante.',
            'product_category_id.exists' => 'A categoria informada nao pertence a este fabricante.',
            'variations.*.variation_type_id.exists' => 'O tipo de variacao informado nao pertence a este fabricante.',
            'variations.*.values.required' => 'Selecione pelo menos um valor para cada variacao.',
            'variations.*.values.min' => 'Selecione pelo menos um valor para cada variacao.',
            'variant_stocks.*.variation_key.required' => 'A chave de variacao e obrigatoria.',
            'variant_stocks.*.quantity.required' => 'Informe a quantidade de estoque para cada variacao.',
            'price.numeric' => 'O preco deve ser um numero valido.',
            'price.min' => 'O preco nao pode ser negativo.',
            'price.max' => 'O preco maximo e R$ 999.999,99.',
        ];
    }

    protected function productAfterValidation(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $variations = collect($this->input('variations', []));
            $stocks = collect($this->input('variant_stocks', []));
            $hasVariations = $variations->isNotEmpty();

            if (! $hasVariations) {
                if ($this->input('base_quantity') === null) {
                    $validator->errors()->add('base_quantity', 'Informe a quantidade base do produto.');
                }

                if ($stocks->isNotEmpty()) {
                    $validator->errors()->add('variant_stocks', 'Nao envie variacoes quando o produto nao tem tipos de variacao.');
                }

                return;
            }

            if ((int) $this->input('base_quantity', 0) > 0) {
                $validator->errors()->add('base_quantity', 'A quantidade base deve ser zero quando ha variacoes.');
            }

            // Validate that each variation type's values exist in the manufacturer's data
            $manufacturerId = $this->user()?->current_manufacturer_id;

            foreach ($variations as $idx => $variation) {
                $typeId = $variation['variation_type_id'] ?? null;
                $values = $variation['values'] ?? [];

                if (! $typeId) {
                    continue;
                }

                $type = VariationType::with('values')
                    ->where('id', $typeId)
                    ->where('manufacturer_id', $manufacturerId)
                    ->first();

                if (! $type) {
                    $validator->errors()->add("variations.{$idx}.variation_type_id", 'Tipo de variacao invalido.');

                    continue;
                }

                $allowedValues = $type->values->pluck('value')->all();
                $unknownValues = array_diff($values, $allowedValues);

                if (! empty($unknownValues)) {
                    $validator->errors()->add(
                        "variations.{$idx}.values",
                        'Valores invalidos para '.$type->name.': '.implode(', ', $unknownValues),
                    );
                }
            }

            // Build expected variation combinations and verify stocks
            if ($stocks->isEmpty() && $hasVariations) {
                $validator->errors()->add('variant_stocks', 'Informe o estoque de todas as variacoes.');

                return;
            }

            // Build expected keys from the cartesian product of variation values
            $valueSets = $variations->map(function ($v) {
                $typeId = $v['variation_type_id'] ?? null;
                $type = $typeId ? VariationType::find($typeId) : null;

                return [
                    'name' => $type?->name ?? "type_{$typeId}",
                    'values' => $v['values'] ?? [],
                ];
            })->values();

            $expectedKeys = collect([[]]);

            foreach ($valueSets as $set) {
                $expectedKeys = $expectedKeys->flatMap(fn (array $combo) => collect($set['values'])->map(fn (string $val) => array_merge($combo, [$set['name'] => $val])));
            }

            // Sort keys in each combination for consistent comparison
            $normalize = fn (array $key) => collect($key)->sortKeys()->toJson();

            $expectedNormalized = $expectedKeys->map($normalize)->unique();
            $providedNormalized = $stocks->map(fn ($s) => $normalize($s['variation_key'] ?? []));

            $missing = $expectedNormalized->diff($providedNormalized->unique());

            if ($missing->isNotEmpty()) {
                $validator->errors()->add('variant_stocks', 'Faltam combinacoes de variacao obrigatorias.');
            }

            if ($providedNormalized->unique()->count() !== $providedNormalized->count()) {
                $validator->errors()->add('variant_stocks', 'Nao envie combinacoes duplicadas de variacao.');
            }
        });
    }
}
