<?php

namespace App\Services;

use App\Models\CatalogSetting;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

class CatalogPublicationService
{
    private const MEDIA_FIELDS = [
        'logo' => 'logo_path',
        'background_image' => 'background_image_path',
        'cover_image' => 'cover_image_path',
    ];

    public function __construct(private readonly CatalogCoverImageStorage $coverStorage) {}

    /**
     * @param  array<string, mixed>  $attributes
     * @param  array<string, UploadedFile|null>  $files
     * @param  array<string, bool>  $removals
     */
    public function publish(CatalogSetting $setting, array $attributes = [], array $files = [], array $removals = []): void
    {
        $storedPaths = [];
        $mediaAttributes = [];
        $changedMedia = [];
        $diskName = (string) config('filesystems.catalog_media_disk', 'public');

        try {
            foreach (self::MEDIA_FIELDS as $field => $pathAttribute) {
                $file = $files[$field] ?? null;

                if ($file instanceof UploadedFile) {
                    if ($field === 'cover_image') {
                        $cover = $this->coverStorage->optimizeAndStore($setting->manufacturer, (string) $file->get());
                        $mediaAttributes['cover_image_path'] = $cover['path'];
                        $mediaAttributes['cover_thumbnail_path'] = $cover['thumbnail_path'];
                        array_push($storedPaths, $cover['path'], $cover['thumbnail_path']);
                    } else {
                        $directory = $field === 'logo' ? 'logos' : 'backgrounds';
                        $path = $file->store("manufacturers/{$setting->manufacturer_id}/catalog/{$directory}", $diskName);

                        if (! is_string($path) || $path === '') {
                            throw new RuntimeException('Não foi possível guardar a nova imagem do catálogo.');
                        }

                        $storedPaths[] = $path;
                        $mediaAttributes[$pathAttribute] = $path;
                    }

                    $changedMedia[] = $field;
                } elseif ($removals[$field] ?? false) {
                    $mediaAttributes[$pathAttribute] = null;
                    $changedMedia[] = $field;

                    if ($field === 'cover_image') {
                        $mediaAttributes['cover_thumbnail_path'] = null;
                        $mediaAttributes['cover_image_focal_x'] = 50;
                        $mediaAttributes['cover_image_focal_y'] = 50;
                    }
                }
            }

            $setting->getConnection()->transaction(function () use ($setting, $attributes, $mediaAttributes, $changedMedia, $diskName): void {
                $current = CatalogSetting::query()
                    ->where('manufacturer_id', $setting->manufacturer_id)
                    ->whereKey($setting->id)
                    ->lockForUpdate()
                    ->firstOrFail();
                $obsoletePaths = [];

                foreach ($changedMedia as $field) {
                    $obsoletePaths[] = $current->getAttribute(self::MEDIA_FIELDS[$field]);

                    if ($field === 'cover_image') {
                        $obsoletePaths[] = $current->cover_thumbnail_path;
                    }
                }

                $current->fill([
                    ...Arr::except($attributes, [
                        'manufacturer_id', 'public_token', 'public_token_rotated_at',
                        'logo', 'background_image', 'cover_image',
                        'remove_logo', 'remove_background_image', 'remove_cover_image',
                        'logo_path', 'background_image_path', 'cover_image_path', 'cover_thumbnail_path',
                    ]),
                    ...$mediaAttributes,
                ]);

                if (! $current->save()) {
                    throw new RuntimeException('Não foi possível salvar as alterações do catálogo.');
                }

                $current->getConnection()->afterCommit(function () use ($obsoletePaths, $diskName): void {
                    foreach (array_unique(['public', $diskName]) as $disk) {
                        $this->cleanUp($disk, $obsoletePaths);
                    }
                });
            });
        } catch (Throwable $exception) {
            $this->cleanUp($diskName, $storedPaths);
            report($exception);

            throw ValidationException::withMessages([
                'catalog_publication' => 'Não foi possível publicar agora. O catálogo anterior continua intacto e suas alterações permanecem aqui. Tente novamente.',
            ]);
        }

        $setting->refresh();
    }

    /**
     * @param  array<int, string|null>  $paths
     */
    private function cleanUp(string $diskName, array $paths): void
    {
        $paths = array_values(array_unique(array_filter($paths)));

        if ($paths === []) {
            return;
        }

        try {
            if (! Storage::disk($diskName)->delete($paths)) {
                report(new RuntimeException('Não foi possível limpar imagens substituídas do catálogo.'));
            }
        } catch (Throwable $exception) {
            report($exception);
        }
    }
}
