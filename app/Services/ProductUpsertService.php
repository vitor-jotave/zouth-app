<?php

namespace App\Services;

use App\Enums\ProductMediaType;
use App\Models\Product;
use App\Models\ProductMedia;
use App\Models\ProductVariation;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

class ProductUpsertService
{
    public function __construct(private readonly ProductImageStorage $imageStorage) {}

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
        if ($type === ProductMediaType::Image) {
            return $this->storeImage($product, $file, $sortOrder);
        }

        if ($type === ProductMediaType::Video) {
            $hasVideo = $product->media()->where('type', ProductMediaType::Video->value)->exists();

            if ($hasVideo) {
                throw ValidationException::withMessages([
                    'file' => 'Apenas um vídeo é permitido por produto.',
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

    private function storeImage(Product $product, UploadedFile $file, ?int $sortOrder): ProductMedia
    {
        $contents = file_get_contents($file->getRealPath());

        if (! is_string($contents) || $contents === '') {
            throw ValidationException::withMessages([
                'files' => 'Não foi possível ler a imagem enviada.',
            ]);
        }

        try {
            $imageAttributes = $this->imageStorage->optimizeAndStore($product, $contents);
        } catch (Throwable $exception) {
            throw ValidationException::withMessages([
                'files' => $exception instanceof RuntimeException
                    ? 'Não foi possível armazenar a imagem. Tente novamente.'
                    : $exception->getMessage(),
            ]);
        }

        $order = $sortOrder ?? ((int) $product->media()->max('sort_order') + 1);

        try {
            return $product->media()->create([
                'type' => ProductMediaType::Image->value,
                'sort_order' => $order,
                ...$imageAttributes,
            ]);
        } catch (Throwable $exception) {
            Storage::disk('s3')->delete([
                $imageAttributes['path'],
                $imageAttributes['thumbnail_path'],
            ]);

            throw $exception;
        }
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
            'video_url' => $data['video_url'] ?? null,
            'base_quantity' => $hasVariations ? 0 : (int) ($data['base_quantity'] ?? 0),
            'is_active' => array_key_exists('is_active', $data) ? (bool) $data['is_active'] : true,
            'allow_quote_when_out_of_stock' => (bool) ($data['allow_quote_when_out_of_stock'] ?? false),
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
        $existingStocks = $product->variantStocks()
            ->get()
            ->keyBy(fn ($stock) => $this->normalizeVariationKey($stock->variation_key));
        $retainedStockIds = [];

        foreach ($stocks as $stock) {
            $variationKey = $stock['variation_key'] ?? [];

            if (empty($variationKey)) {
                continue;
            }

            $attributes = [
                'variation_key' => $variationKey,
                'quantity' => (int) ($stock['quantity'] ?? 0),
                'price_cents' => isset($stock['price_cents']) && $stock['price_cents'] !== '' && $stock['price_cents'] !== null
                    ? (int) $stock['price_cents']
                    : null,
                'sku_variant' => Arr::get($stock, 'sku_variant'),
            ];

            $existingStock = $existingStocks->get($this->normalizeVariationKey($variationKey));

            if ($existingStock) {
                $existingStock->update($attributes);
                $retainedStockIds[] = $existingStock->id;

                continue;
            }

            $retainedStockIds[] = $product->variantStocks()->create($attributes)->id;
        }

        $product->variantStocks()
            ->whereNotIn('id', $retainedStockIds)
            ->delete();
    }

    /**
     * Build an order-independent identity for a variation combination.
     *
     * @param  array<string, string>  $variationKey
     */
    private function normalizeVariationKey(array $variationKey): string
    {
        ksort($variationKey);

        return json_encode($variationKey, JSON_THROW_ON_ERROR);
    }
}
