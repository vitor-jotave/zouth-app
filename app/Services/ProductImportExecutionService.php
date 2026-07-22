<?php

namespace App\Services;

use App\Enums\ProductImportStatus;
use App\Enums\ProductMediaType;
use App\Models\Product;
use App\Models\ProductImport;
use App\Models\ProductMedia;
use App\Models\ProductVariantStock;
use App\Models\VariationType;
use App\Models\VariationValue;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class ProductImportExecutionService
{
    public function __construct(private readonly ProductImageStorage $imageStorage) {}

    public function execute(ProductImport $productImport): ProductImport
    {
        $productImport->update([
            'status' => ProductImportStatus::Processing,
            'processing_started_at' => $productImport->processing_started_at ?? now(),
            'progress' => 40,
            'error_message' => null,
        ]);
        $groups = $productImport->rows()
            ->whereNull('processed_at')
            ->get()
            ->groupBy('product_sku');
        $failed = 0;
        $processed = 0;
        $total = max(1, $groups->count());

        foreach ($groups as $sku => $rows) {
            if (! is_string($sku) || $sku === '') {
                continue;
            }

            try {
                $product = DB::transaction(fn (): Product => $this->upsertProduct($productImport, $sku, $rows));
                $this->storeStagedImages($productImport, $product);

                $rows->each(fn ($row) => $row->update([
                    'product_id' => $product->id,
                    'action' => match ($row->action) {
                        'create' => 'created',
                        'unchanged' => 'unchanged',
                        default => 'updated',
                    },
                    'processed_at' => now(),
                ]));
            } catch (Throwable $exception) {
                $failed++;
                $rows->each(fn ($row) => $row->update([
                    'action' => 'error',
                    'errors' => array_values(array_unique([
                        ...($row->errors ?? []),
                        'Falha inesperada: '.$exception->getMessage(),
                    ])),
                ]));
                Log::error('Product import group failed.', [
                    'product_import_id' => $productImport->id,
                    'sku' => $sku,
                    'exception' => $exception,
                ]);
            }

            $processed++;
            $productImport->update([
                'progress' => min(95, 40 + (int) round(($processed / $total) * 55)),
            ]);
        }

        $remaining = $productImport->rows()->whereNull('processed_at')->count();
        $status = $failed > 0 || $remaining > 0
            ? ProductImportStatus::CompletedWithErrors
            : ProductImportStatus::Completed;
        $summary = $productImport->summary ?? [];
        $summary['processed'] = $productImport->rows()->whereNotNull('processed_at')->count();
        $summary['failed'] = $remaining;

        $productImport->update([
            'status' => $status,
            'summary' => $summary,
            'progress' => 100,
            'completed_at' => now(),
        ]);

        return $productImport->refresh();
    }

    private function upsertProduct(ProductImport $productImport, string $sku, Collection $rows): Product
    {
        $product = Product::query()
            ->where('manufacturer_id', $productImport->manufacturer_id)
            ->where('sku', $sku)
            ->lockForUpdate()
            ->first();
        $normalizedRows = $rows->pluck('normalized');
        $first = $normalizedRows->first();
        $hasVariations = collect($first['variations'])->isNotEmpty();
        $categoryName = $this->firstPresentValue($normalizedRows, 'category');
        $category = $categoryName !== null
            ? $this->category($productImport, (string) $categoryName)
            : null;

        if (! $product) {
            $product = Product::create([
                'manufacturer_id' => $productImport->manufacturer_id,
                'product_category_id' => $category?->id,
                'product_type' => 'product',
                'name' => (string) $this->firstPresentValue($normalizedRows, 'name'),
                'sku' => $sku,
                'description' => $this->firstPresentValue($normalizedRows, 'description'),
                'base_quantity' => $hasVariations ? 0 : (int) ($this->firstPresentValue($normalizedRows, 'stock') ?? 0),
                'is_active' => $this->firstPresentValue($normalizedRows, 'is_active') ?? true,
                'sort_order' => ((int) Product::query()->where('manufacturer_id', $productImport->manufacturer_id)->max('sort_order')) + 1,
                'price_cents' => $this->firstPresentValue($normalizedRows, 'price_cents'),
            ]);
        } else {
            $updates = [];

            foreach (['name', 'description', 'is_active', 'price_cents'] as $field) {
                $value = $this->firstPresentValue($normalizedRows, $field);

                if ($value !== null) {
                    $updates[$field] = $value;
                }
            }

            if ($categoryName !== null) {
                $updates['product_category_id'] = $category?->id;
            }

            if (! $hasVariations) {
                $stock = $this->firstPresentValue($normalizedRows, 'stock');

                if ($stock !== null) {
                    $updates['base_quantity'] = $stock;
                }
            }

            if ($updates !== []) {
                $product->update($updates);
            }
        }

        if ($hasVariations) {
            $this->mergeVariations($productImport, $product, $normalizedRows);
        }

        return $product;
    }

    private function category(ProductImport $productImport, string $name): mixed
    {
        $existing = $productImport->manufacturer->productCategories()
            ->whereRaw('LOWER(name) = ?', [Str::lower($name)])
            ->first();

        if ($existing) {
            return $existing;
        }

        $baseSlug = Str::slug($name) ?: 'categoria';
        $slug = $baseSlug;
        $suffix = 2;

        while ($productImport->manufacturer->productCategories()->where('slug', $slug)->exists()) {
            $slug = "{$baseSlug}-{$suffix}";
            $suffix++;
        }

        return $productImport->manufacturer->productCategories()->create([
            'name' => $name,
            'slug' => $slug,
        ]);
    }

    private function mergeVariations(ProductImport $productImport, Product $product, Collection $rows): void
    {
        foreach ($rows as $row) {
            $variationKey = [];

            foreach ($row['variations'] as $variation) {
                $type = $this->variationType($productImport, $variation['type']);
                $value = $this->variationValue($type, $variation['value']);
                $product->productVariations()->firstOrCreate(['variation_type_id' => $type->id]);
                $variationKey[$type->name] = $value->value;
            }

            $stock = $this->findStock($product, $row['variant_sku'], $variationKey);
            $attributes = ['variation_key' => $variationKey];

            if ($row['present']['variant_stock']) {
                $attributes['quantity'] = $row['variant_stock'];
            }

            if ($row['present']['variant_price']) {
                $attributes['price_cents'] = $row['variant_price_cents'];
            }

            if ($row['present']['variant_sku']) {
                $attributes['sku_variant'] = $row['variant_sku'];
            }

            if ($stock) {
                $stock->update($attributes);
            } else {
                $product->variantStocks()->create([
                    ...$attributes,
                    'quantity' => $attributes['quantity'] ?? 0,
                    'price_cents' => $attributes['price_cents'] ?? null,
                    'sku_variant' => $attributes['sku_variant'] ?? null,
                ]);
            }
        }
    }

    private function variationType(ProductImport $productImport, string $name): VariationType
    {
        $type = VariationType::query()
            ->where('manufacturer_id', $productImport->manufacturer_id)
            ->whereRaw('LOWER(name) = ?', [Str::lower($name)])
            ->first();

        if ($type) {
            return $type;
        }

        return VariationType::create([
            'manufacturer_id' => $productImport->manufacturer_id,
            'name' => $name,
            'is_color_type' => in_array(Str::lower(Str::ascii($name)), ['cor', 'color', 'estampa'], true),
            'display_order' => ((int) VariationType::query()->where('manufacturer_id', $productImport->manufacturer_id)->max('display_order')) + 1,
        ]);
    }

    private function variationValue(VariationType $type, string $value): VariationValue
    {
        $existing = $type->values()->whereRaw('LOWER(value) = ?', [Str::lower($value)])->first();

        return $existing ?? $type->values()->create([
            'value' => $value,
            'display_order' => ((int) $type->values()->max('display_order')) + 1,
        ]);
    }

    private function findStock(Product $product, string $variantSku, array $variationKey): ?ProductVariantStock
    {
        if ($variantSku !== '') {
            $stock = $product->variantStocks()->where('sku_variant', $variantSku)->first();

            if ($stock) {
                return $stock;
            }
        }

        $identity = $this->variationIdentity($variationKey);

        return $product->variantStocks()->get()->first(
            fn (ProductVariantStock $stock): bool => $this->variationIdentity($stock->variation_key) === $identity,
        );
    }

    private function firstPresentValue(Collection $rows, string $field): mixed
    {
        $presenceField = $field === 'price_cents' ? 'price' : $field;
        $row = $rows->first(fn (array $row): bool => (bool) ($row['present'][$presenceField] ?? false));

        return $row[$field] ?? null;
    }

    private function variationIdentity(array $variationKey): string
    {
        $normalized = collect($variationKey)
            ->mapWithKeys(fn (string $value, string $type): array => [Str::lower(Str::ascii($type)) => Str::lower(Str::ascii($value))])
            ->sortKeys()
            ->all();

        return json_encode($normalized, JSON_THROW_ON_ERROR);
    }

    private function storeStagedImages(ProductImport $productImport, Product $product): void
    {
        $options = $productImport->options ?? [];
        $manifest = $options['staged_images'][$product->sku] ?? [];
        $storedMedia = collect();
        $storedPaths = [];

        try {
            foreach ($manifest as $staged) {
                $masterContents = Storage::disk('local')->get($staged['master_path']);
                $thumbnailContents = Storage::disk('local')->get($staged['thumbnail_path']);
                $attributes = $this->imageStorage->storeOptimized($product, [
                    'master_contents' => $masterContents,
                    'thumbnail_contents' => $thumbnailContents,
                    'width' => $staged['width'],
                    'height' => $staged['height'],
                    'thumbnail_width' => $staged['thumbnail_width'],
                    'thumbnail_height' => $staged['thumbnail_height'],
                ]);
                $storedPaths[] = $attributes['path'];
                $storedPaths[] = $attributes['thumbnail_path'];
                $storedMedia->push(ProductMedia::create([
                    'product_id' => $product->id,
                    'type' => ProductMediaType::Image->value,
                    'sort_order' => ((int) $product->media()->max('sort_order')) + 1,
                    ...$attributes,
                ]));
            }
        } catch (Throwable $exception) {
            Storage::disk('s3')->delete($storedPaths);
            $storedMedia->each->delete();
            throw $exception;
        }
    }
}
