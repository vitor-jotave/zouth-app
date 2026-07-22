<?php

use App\Enums\ProductMediaType;
use App\Models\Product;
use App\Models\ProductMedia;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

it('reprocesses legacy product images and preserves the source file', function () {
    Storage::fake('s3');

    $product = Product::factory()->create();
    $legacyImage = UploadedFile::fake()->image('legacy.jpg', 3000, 2000);
    $legacyContents = file_get_contents($legacyImage->getRealPath());
    $legacyPath = 'products/legacy/large-image.jpg';

    Storage::disk('s3')->put($legacyPath, $legacyContents);

    $media = ProductMedia::factory()->create([
        'product_id' => $product->id,
        'type' => ProductMediaType::Image->value,
        'path' => $legacyPath,
        'thumbnail_path' => null,
        'file_size_bytes' => strlen($legacyContents),
        'optimized_at' => null,
    ]);

    $this->artisan('app:optimize-product-images')->assertSuccessful();

    $media->refresh();

    expect($media->path)->not->toBe($legacyPath)
        ->and($media->thumbnail_path)->not->toBeNull()
        ->and($media->optimized_at)->not->toBeNull()
        ->and(max($media->width, $media->height))->toBeLessThanOrEqual(2000);

    Storage::disk('s3')->assertExists([
        $legacyPath,
        $media->path,
        $media->thumbnail_path,
    ]);

    $thumbnailSize = getimagesizefromstring(
        Storage::disk('s3')->get($media->thumbnail_path),
    );

    expect(max($thumbnailSize[0], $thumbnailSize[1]))->toBeLessThanOrEqual(640);

    $optimizedPath = $media->path;

    $this->artisan('app:optimize-product-images')->assertSuccessful();

    expect($media->fresh()->path)->toBe($optimizedPath);
});
