<?php

namespace App\Services;

use App\Models\Manufacturer;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class CatalogCoverImageStorage
{
    public function __construct(private readonly ProductImageOptimizer $optimizer) {}

    /**
     * @return array{path: string, thumbnail_path: string}
     */
    public function optimizeAndStore(Manufacturer $manufacturer, string $contents): array
    {
        $optimized = $this->optimizer->optimize($contents);
        $key = (string) Str::uuid();
        $basePath = "manufacturers/{$manufacturer->id}/catalog/covers";
        $path = "{$basePath}/{$key}.jpg";
        $thumbnailPath = "{$basePath}/thumbnails/{$key}.jpg";
        $disk = $this->disk();
        $storedPaths = [];
        $options = [
            'ContentType' => 'image/jpeg',
            'CacheControl' => 'public, max-age=31536000, immutable',
        ];

        try {
            if (! $disk->put($path, $optimized['master_contents'], $options)) {
                throw new RuntimeException('Nao foi possivel armazenar a imagem de capa.');
            }

            $storedPaths[] = $path;

            if (! $disk->put($thumbnailPath, $optimized['thumbnail_contents'], $options)) {
                throw new RuntimeException('Nao foi possivel armazenar a miniatura da capa.');
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
        ];
    }

    public function delete(?string $path, ?string $thumbnailPath = null): void
    {
        $paths = array_values(array_filter([$path, $thumbnailPath]));

        if ($paths !== []) {
            $this->disk()->delete($paths);
        }
    }

    private function disk(): Filesystem
    {
        return Storage::disk((string) config('filesystems.catalog_media_disk', 'public'));
    }
}
