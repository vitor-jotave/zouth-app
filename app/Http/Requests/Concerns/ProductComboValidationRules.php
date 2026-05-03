<?php

namespace App\Http\Requests\Concerns;

use App\Models\Product;
use App\Models\ProductVariantStock;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\File;

trait ProductComboValidationRules
{
    protected function productComboPrepareForValidation(): void
    {
        $this->merge([
            'price' => $this->normalizeComboPrice($this->input('price')),
            'combo_items' => collect($this->input('combo_items', []))
                ->map(function (mixed $item) {
                    if (! is_array($item)) {
                        return $item;
                    }

                    return [
                        ...$item,
                        'component_variant_stock_id' => $item['component_variant_stock_id'] ?? null,
                    ];
                })
                ->values()
                ->all(),
        ]);
    }

    private function normalizeComboPrice(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return str_replace(',', '.', (string) $value);
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    protected function productComboRules(?int $manufacturerId, ?int $excludeProductId = null): array
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
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer'],
            'price' => ['required', 'numeric', 'min:0', 'max:999999.99'],
            'combo_items' => ['required', 'array', 'min:1'],
            'combo_items.*.component_product_id' => ['required', 'integer', 'exists:products,id'],
            'combo_items.*.component_variant_stock_id' => ['nullable', 'integer', 'exists:product_variant_stocks,id'],
            'combo_items.*.quantity' => ['required', 'integer', 'min:1', 'max:9999'],
            'images' => ['nullable', 'array', 'max:10'],
            'images.*' => [File::image()->max(5120)],
            'video' => ['nullable', File::types(['mp4', 'mov', 'webm'])->max(51200)],
        ];
    }

    /**
     * @return array<string, string>
     */
    protected function productComboMessages(): array
    {
        return [
            'name.required' => 'O nome do combo e obrigatorio.',
            'sku.required' => 'O SKU e obrigatorio.',
            'sku.unique' => 'Este SKU ja esta em uso neste fabricante.',
            'price.required' => 'O preco do combo e obrigatorio.',
            'price.numeric' => 'O preco deve ser um numero valido.',
            'price.min' => 'O preco nao pode ser negativo.',
            'price.max' => 'O preco maximo e R$ 999.999,99.',
            'combo_items.required' => 'Adicione pelo menos um produto ao combo.',
            'combo_items.min' => 'Adicione pelo menos um produto ao combo.',
            'combo_items.*.component_product_id.required' => 'Selecione um produto.',
            'combo_items.*.quantity.required' => 'Informe a quantidade do produto no combo.',
            'combo_items.*.quantity.min' => 'A quantidade minima e 1.',
        ];
    }

    protected function productComboAfterValidation(Validator $validator, ?Product $combo = null): void
    {
        $validator->after(function (Validator $validator) use ($combo) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $manufacturerId = $this->user()?->current_manufacturer_id;

            foreach (collect($this->input('combo_items', [])) as $index => $item) {
                $component = Product::query()
                    ->with('variantStocks')
                    ->where('id', $item['component_product_id'] ?? null)
                    ->first();

                if (! $component
                    || $component->manufacturer_id !== $manufacturerId
                    || ! $component->is_active
                    || $component->isCombo()
                    || ($combo && $component->id === $combo->id)) {
                    $validator->errors()->add("combo_items.{$index}.component_product_id", 'Selecione um produto ativo deste fabricante.');

                    continue;
                }

                $variantStockId = $item['component_variant_stock_id'] ?? null;

                if ($component->hasVariations() && ! $variantStockId) {
                    $validator->errors()->add("combo_items.{$index}.component_variant_stock_id", 'Selecione uma variacao para este produto.');

                    continue;
                }

                if (! $component->hasVariations() && $variantStockId) {
                    $validator->errors()->add("combo_items.{$index}.component_variant_stock_id", 'Este produto nao possui variacoes.');

                    continue;
                }

                if ($variantStockId) {
                    $stock = ProductVariantStock::query()
                        ->where('id', $variantStockId)
                        ->where('product_id', $component->id)
                        ->first();

                    if (! $stock) {
                        $validator->errors()->add("combo_items.{$index}.component_variant_stock_id", 'A variacao selecionada nao pertence ao produto.');
                    }
                }
            }
        });
    }
}
