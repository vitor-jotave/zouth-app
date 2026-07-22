<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class VariationTextureStorage
{
    public function __construct(private readonly VariationTextureOptimizer $optimizer) {}

    /**
     * @return array{image_path: string, thumbnail_path: string}
     */
    public function optimizeAndStore(string $contents): array
    {
        $optimized = $this->optimizer->optimize($contents);
        $key = (string) Str::uuid();
        $imagePath = "variation-values/{$key}.webp";
        $thumbnailPath = "variation-values/thumbnails/{$key}.webp";
        $disk = Storage::disk('s3');
        $storedPaths = [];
        $options = [
            'ContentType' => 'image/webp',
            'CacheControl' => 'public, max-age=31536000, immutable',
        ];

        try {
            if (! $disk->put($imagePath, $optimized['master_contents'], $options)) {
                throw new RuntimeException('Não foi possível armazenar a textura otimizada.');
            }

            $storedPaths[] = $imagePath;

            if (! $disk->put($thumbnailPath, $optimized['thumbnail_contents'], $options)) {
                throw new RuntimeException('Não foi possível armazenar a miniatura da textura.');
            }

            $storedPaths[] = $thumbnailPath;
        } catch (Throwable $exception) {
            if ($storedPaths !== []) {
                $disk->delete($storedPaths);
            }

            throw $exception;
        }

        return [
            'image_path' => $imagePath,
            'thumbnail_path' => $thumbnailPath,
        ];
    }

    public function delete(?string $imagePath, ?string $thumbnailPath): void
    {
        $paths = array_values(array_filter([$imagePath, $thumbnailPath]));

        if ($paths !== []) {
            Storage::disk('s3')->delete($paths);
        }
    }
}
