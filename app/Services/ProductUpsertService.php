<?php

namespace App\Services;

use App\Enums\ProductMediaType;
use App\Models\Product;
use App\Models\ProductMedia;
use App\Models\ProductVariation;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProductUpsertService
{
    public function createProduct(array $data): Product
    {
        return $this->upsert(null, $data);
    }

    public function updateProduct(Product $product, array $data): Product
    {
        return $this->upsert($product, $data);
    }

    public function storeMedia(Product $product, UploadedFile $file, ProductMediaType $type, ?int $sortOrder = null): ProductMedia
    {
        if ($type === ProductMediaType::Video) {
            $hasVideo = $product->media()->where('type', ProductMediaType::Video->value)->exists();

            if ($hasVideo) {
                throw ValidationException::withMessages([
                    'type' => 'Apenas um video e permitido por produto.',
                ]);
            }
        }

        $path = $file->store("products/{$product->id}", 's3');
        $order = $sortOrder ?? ((int) $product->media()->max('sort_order') + 1);

        return $product->media()->create([
            'type' => $type->value,
            'path' => $path,
            'sort_order' => $order,
            'file_size_bytes' => $file->getSize(),
        ]);
    }

    public function reorderMedia(Product $product, array $mediaOrder): void
    {
        $orderIds = collect($mediaOrder)->filter()->values();
        $orderMap = $orderIds->flip();

        $media = $product->media()->get();

        foreach ($media as $item) {
            if ($orderMap->has($item->id)) {
                $item->update(['sort_order' => $orderMap[$item->id]]);
            }
        }

        $remaining = $media->whereNotIn('id', $orderIds);
        $nextOrder = $orderIds->count();

        foreach ($remaining as $item) {
            $item->update(['sort_order' => $nextOrder]);
            $nextOrder++;
        }
    }

    protected function upsert(?Product $product, array $data): Product
    {
        return DB::transaction(function () use ($product, $data) {
            $payload = $this->normalizeProductData($data);

            if ($product) {
                $product->update($payload);
            } else {
                $product = Product::create($payload);
            }

            $this->syncVariations($product, $data);
            $this->syncVariantStocks($product, $data);

            if (! empty($data['media_order'])) {
                $this->reorderMedia($product, $data['media_order']);
            }

            return $product->fresh(['category', 'media', 'productVariations.variationType.values', 'variantStocks']);
        });
    }

    protected function normalizeProductData(array $data): array
    {
        $hasVariations = ! empty($data['variations']);

        return [
            'manufacturer_id' => $data['manufacturer_id'],
            'product_category_id' => $data['product_category_id'] ?? null,
            'name' => $data['name'],
            'sku' => $data['sku'],
            'description' => $data['description'] ?? null,
            'base_quantity' => $hasVariations ? 0 : (int) ($data['base_quantity'] ?? 0),
            'is_active' => array_key_exists('is_active', $data) ? (bool) $data['is_active'] : true,
            'sort_order' => (int) ($data['sort_order'] ?? 0),
            'price_cents' => $this->toCents($data['price'] ?? null),
        ];
    }

    /**
     * Convert a decimal price string to cents (integer).
     */
    private function toCents(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        return (int) round((float) $value * 100);
    }

    /**
     * Sync product_variations pivot: which variation_types apply to this product.
     */
    protected function syncVariations(Product $product, array $data): void
    {
        $variations = collect($data['variations'] ?? []);

        if ($variations->isEmpty()) {
            $product->productVariations()->delete();

            return;
        }

        $variationTypeIds = $variations->pluck('variation_type_id')->filter()->values()->all();

        // Remove variations no longer assigned
        $product->productVariations()->whereNotIn('variation_type_id', $variationTypeIds)->delete();

        // Create new ones
        foreach ($variationTypeIds as $typeId) {
            ProductVariation::firstOrCreate([
                'product_id' => $product->id,
                'variation_type_id' => $typeId,
            ]);
        }
    }

    /**
     * Sync variant stocks using flexible variation_key JSON.
     */
    protected function syncVariantStocks(Product $product, array $data): void
    {
        $variations = collect($data['variations'] ?? []);

        if ($variations->isEmpty()) {
            $product->variantStocks()->delete();

            return;
        }

        $stocks = collect($data['variant_stocks'] ?? []);

        // Delete all and recreate for simplicity
        $product->variantStocks()->delete();

        foreach ($stocks as $stock) {
            $variationKey = $stock['variation_key'] ?? [];

            if (empty($variationKey)) {
                continue;
            }

            $product->variantStocks()->create([
                'variation_key' => $variationKey,
                'quantity' => (int) ($stock['quantity'] ?? 0),
                'price_cents' => isset($stock['price_cents']) && $stock['price_cents'] !== '' && $stock['price_cents'] !== null
                    ? (int) $stock['price_cents']
                    : null,
                'sku_variant' => Arr::get($stock, 'sku_variant'),
            ]);
        }
    }
}
