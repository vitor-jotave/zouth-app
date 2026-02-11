<?php

namespace App\Services;

use App\Enums\ProductMediaType;
use App\Models\Product;
use App\Models\ProductMedia;
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

        $path = $file->store("products/{$product->id}", 'public');
        $order = $sortOrder ?? ((int) $product->media()->max('sort_order') + 1);

        return $product->media()->create([
            'type' => $type->value,
            'path' => $path,
            'sort_order' => $order,
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

            $colorMap = $this->syncColors($product, $data);
            $this->syncVariantStocks($product, $data, $colorMap);

            if (! empty($data['media_order'])) {
                $this->reorderMedia($product, $data['media_order']);
            }

            return $product->fresh(['category', 'media', 'colors', 'variantStocks.color']);
        });
    }

    protected function normalizeProductData(array $data): array
    {
        $hasVariants = (bool) ($data['has_size_variants'] ?? false)
            || (bool) ($data['has_color_variants'] ?? false);

        return [
            'manufacturer_id' => $data['manufacturer_id'],
            'product_category_id' => $data['product_category_id'] ?? null,
            'name' => $data['name'],
            'sku' => $data['sku'],
            'description' => $data['description'] ?? null,
            'has_size_variants' => (bool) ($data['has_size_variants'] ?? false),
            'has_color_variants' => (bool) ($data['has_color_variants'] ?? false),
            'base_quantity' => $hasVariants ? 0 : (int) ($data['base_quantity'] ?? 0),
            'is_active' => array_key_exists('is_active', $data) ? (bool) $data['is_active'] : true,
            'sort_order' => (int) ($data['sort_order'] ?? 0),
        ];
    }

    protected function syncColors(Product $product, array $data): array
    {
        if (! ($data['has_color_variants'] ?? false)) {
            $product->colors()->delete();

            return [];
        }

        $colors = collect($data['colors'] ?? [])
            ->filter(fn (array $color) => ! empty($color['name']))
            ->values();

        $names = $colors->pluck('name')->all();

        if ($names !== []) {
            $product->colors()->whereNotIn('name', $names)->delete();
        } else {
            $product->colors()->delete();
        }

        foreach ($colors as $color) {
            $product->colors()->updateOrCreate(
                ['name' => $color['name']],
                ['hex' => $color['hex'] ?? null],
            );
        }

        return $product->colors()
            ->whereIn('name', $names)
            ->pluck('id', 'name')
            ->all();
    }

    protected function syncVariantStocks(Product $product, array $data, array $colorMap): void
    {
        $hasSizes = (bool) ($data['has_size_variants'] ?? false);
        $hasColors = (bool) ($data['has_color_variants'] ?? false);

        if (! $hasSizes && ! $hasColors) {
            $product->variantStocks()->delete();

            return;
        }

        $stocks = collect($data['variant_stocks'] ?? []);

        $product->variantStocks()->delete();

        foreach ($stocks as $stock) {
            $size = $hasSizes ? ($stock['size'] ?? null) : null;
            $colorName = $hasColors ? ($stock['color_name'] ?? null) : null;
            $colorId = null;

            if ($hasColors) {
                $colorId = $colorMap[$colorName] ?? null;

                if (! $colorId) {
                    throw ValidationException::withMessages([
                        'variant_stocks' => 'As variacoes informam cores que nao foram cadastradas.',
                    ]);
                }
            }

            $product->variantStocks()->create([
                'size' => $size,
                'product_color_id' => $colorId,
                'quantity' => (int) ($stock['quantity'] ?? 0),
                'sku_variant' => Arr::get($stock, 'sku_variant'),
            ]);
        }
    }
}
