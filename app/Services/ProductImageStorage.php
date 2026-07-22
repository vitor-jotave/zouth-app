<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class ProductImageStorage
{
    public function __construct(private readonly ProductImageOptimizer $optimizer) {}

    /**
     * @return array{
     *     path: string,
     *     thumbnail_path: string,
     *     file_size_bytes: int,
     *     thumbnail_size_bytes: int,
     *     width: int,
     *     height: int,
     *     optimized_at: \Illuminate\Support\Carbon
     * }
     */
    public function optimizeAndStore(Product $product, string $contents): array
    {
        return $this->storeOptimized($product, $this->optimizer->optimize($contents));
    }

    /**
     * @param  array{
     *     master_contents: string,
     *     thumbnail_contents: string,
     *     width: int,
     *     height: int,
     *     thumbnail_width: int,
     *     thumbnail_height: int
     * }  $optimized
     * @return array{
     *     path: string,
     *     thumbnail_path: string,
     *     file_size_bytes: int,
     *     thumbnail_size_bytes: int,
     *     width: int,
     *     height: int,
     *     optimized_at: \Illuminate\Support\Carbon
     * }
     */
    public function storeOptimized(Product $product, array $optimized): array
    {
        $key = (string) Str::uuid();
        $path = "products/{$product->id}/images/{$key}.jpg";
        $thumbnailPath = "products/{$product->id}/thumbnails/{$key}.jpg";
        $disk = Storage::disk('s3');
        $storedPaths = [];
        $options = [
            'ContentType' => 'image/jpeg',
            'CacheControl' => 'public, max-age=31536000, immutable',
        ];

        try {
            if (! $disk->put($path, $optimized['master_contents'], $options)) {
                throw new RuntimeException('Não foi possível armazenar a imagem otimizada.');
            }

            $storedPaths[] = $path;

            if (! $disk->put($thumbnailPath, $optimized['thumbnail_contents'], $options)) {
                throw new RuntimeException('Não foi possível armazenar a miniatura da imagem.');
            }

            $storedPaths[] = $thumbnailPath;
        } catch (Throwable $exception) {
            if ($storedPaths !== []) {
                $disk->delete($storedPaths);
            }

            throw $exception;
        }

        return [
            'path' => $path,
            'thumbnail_path' => $thumbnailPath,
            'file_size_bytes' => strlen($optimized['master_contents']),
            'thumbnail_size_bytes' => strlen($optimized['thumbnail_contents']),
            'width' => $optimized['width'],
            'height' => $optimized['height'],
            'optimized_at' => now(),
        ];
    }
}
