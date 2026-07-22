<?php

use App\Services\VariationTextureOptimizer;
use Illuminate\Http\UploadedFile;

it('creates square webp texture derivatives within their size limits', function () {
    $source = UploadedFile::fake()->image('tecido.jpg', 1600, 900);
    $contents = file_get_contents($source->getRealPath());

    $optimized = (new VariationTextureOptimizer)->optimize($contents);
    $masterDimensions = getimagesizefromstring($optimized['master_contents']);
    $thumbnailDimensions = getimagesizefromstring($optimized['thumbnail_contents']);

    expect($masterDimensions)->not->toBeFalse()
        ->and([$masterDimensions[0], $masterDimensions[1]])
        ->toBe([
            VariationTextureOptimizer::MASTER_SIZE,
            VariationTextureOptimizer::MASTER_SIZE,
        ])
        ->and($masterDimensions['mime'])->toBe('image/webp')
        ->and(strlen($optimized['master_contents']))
        ->toBeLessThanOrEqual(VariationTextureOptimizer::MAX_MASTER_BYTES)
        ->and($thumbnailDimensions)->not->toBeFalse()
        ->and([$thumbnailDimensions[0], $thumbnailDimensions[1]])
        ->toBe([
            VariationTextureOptimizer::THUMBNAIL_SIZE,
            VariationTextureOptimizer::THUMBNAIL_SIZE,
        ])
        ->and($thumbnailDimensions['mime'])->toBe('image/webp')
        ->and(strlen($optimized['thumbnail_contents']))
        ->toBeLessThanOrEqual(VariationTextureOptimizer::MAX_THUMBNAIL_BYTES)
        ->and(strlen($optimized['thumbnail_contents']))
        ->toBeLessThan(strlen($optimized['master_contents']));
});
