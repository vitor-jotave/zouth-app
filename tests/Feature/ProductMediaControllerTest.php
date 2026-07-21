<?php

use App\Enums\ProductMediaType;
use App\Enums\UserType;
use App\Models\Manufacturer;
use App\Models\Plan;
use App\Models\Product;
use App\Models\ProductMedia;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('local');
    Storage::fake('s3');
    $this->withoutVite();

    $plan = Plan::factory()->premium()->create();
    $this->manufacturer = Manufacturer::factory()->create([
        'is_active' => true,
        'current_plan_id' => $plan->id,
    ]);
    $this->owner = User::factory()->create([
        'user_type' => UserType::ManufacturerUser,
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);
    $this->manufacturer->users()->attach($this->owner->id, [
        'role' => 'owner',
        'status' => 'active',
    ]);

    $this->product = Product::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
    ]);
});

// ──────────────────────────────────────────────
// Store Images
// ──────────────────────────────────────────────

it('uploads images to a product', function () {
    $files = [
        UploadedFile::fake()->image('img1.jpg', 800, 600),
        UploadedFile::fake()->image('img2.jpg', 800, 600),
    ];

    $this->actingAs($this->owner)
        ->post(route('manufacturer.products.media.store', $this->product), [
            'type' => ProductMediaType::Image->value,
            'files' => $files,
            'sort_order' => 0,
        ])
        ->assertRedirect();

    $mediaItems = ProductMedia::where('product_id', $this->product->id)->get();

    expect($mediaItems)->toHaveCount(2);

    $mediaItems->each(function (ProductMedia $media) {
        expect($media->path)->toEndWith('.jpg')
            ->and($media->thumbnail_path)->not->toBeNull()
            ->and($media->optimized_at)->not->toBeNull()
            ->and($media->width)->toBeLessThanOrEqual(2000)
            ->and($media->height)->toBeLessThanOrEqual(2000);

        Storage::disk('s3')->assertExists([
            $media->path,
            $media->thumbnail_path,
        ]);

        $thumbnailSize = getimagesizefromstring(
            Storage::disk('s3')->get($media->thumbnail_path),
        );

        expect(max($thumbnailSize[0], $thumbnailSize[1]))->toBeLessThanOrEqual(640);
    });
});

it('denies upload for product from another manufacturer', function () {
    $otherProduct = Product::factory()->create();

    $this->actingAs($this->owner)
        ->post(route('manufacturer.products.media.store', $otherProduct), [
            'type' => ProductMediaType::Image->value,
            'files' => [UploadedFile::fake()->image('img.jpg')],
        ])
        ->assertForbidden();
});

it('denies direct media upload for a combo', function () {
    $combo = Product::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'product_type' => 'combo',
    ]);

    $this->actingAs($this->owner)
        ->post(route('manufacturer.products.media.store', $combo), [
            'type' => ProductMediaType::Image->value,
            'files' => [UploadedFile::fake()->image('combo.jpg')],
        ])
        ->assertForbidden();

    expect($combo->media()->count())->toBe(0);
});

it('denies unauthenticated media upload', function () {
    $this->post(route('manufacturer.products.media.store', $this->product), [
        'type' => ProductMediaType::Image->value,
        'files' => [UploadedFile::fake()->image('img.jpg')],
    ])->assertRedirect(route('login'));
});

it('validates required type field', function () {
    $this->actingAs($this->owner)
        ->post(route('manufacturer.products.media.store', $this->product), [
            'files' => [UploadedFile::fake()->image('img.jpg')],
        ])
        ->assertSessionHasErrors('type');
});

it('limits a product to ten images across existing and new uploads', function () {
    foreach (range(1, 9) as $index) {
        ProductMedia::create([
            'product_id' => $this->product->id,
            'type' => ProductMediaType::Image->value,
            'path' => "product-media/existing-{$index}.jpg",
            'sort_order' => $index - 1,
        ]);
    }

    $this->actingAs($this->owner)
        ->post(route('manufacturer.products.media.store', $this->product), [
            'type' => ProductMediaType::Image->value,
            'files' => [
                UploadedFile::fake()->image('new-1.jpg'),
                UploadedFile::fake()->image('new-2.jpg'),
            ],
        ])
        ->assertSessionHasErrors([
            'files' => 'Um produto pode ter no máximo 10 imagens. Remova uma imagem antes de adicionar novas.',
        ]);

    expect($this->product->media()->where('type', ProductMediaType::Image->value)->count())->toBe(9);
});

it('accepts the image that fills the tenth product slot', function () {
    foreach (range(1, 9) as $index) {
        ProductMedia::create([
            'product_id' => $this->product->id,
            'type' => ProductMediaType::Image->value,
            'path' => "product-media/existing-{$index}.jpg",
            'sort_order' => $index - 1,
        ]);
    }

    $this->actingAs($this->owner)
        ->post(route('manufacturer.products.media.store', $this->product), [
            'type' => ProductMediaType::Image->value,
            'files' => [UploadedFile::fake()->image('tenth.jpg')],
        ])
        ->assertRedirect()
        ->assertSessionDoesntHaveErrors();

    expect($this->product->media()->where('type', ProductMediaType::Image->value)->count())->toBe(10);
});

it('maps a duplicate video error to the uploaded file field', function () {
    ProductMedia::create([
        'product_id' => $this->product->id,
        'type' => ProductMediaType::Video->value,
        'path' => 'product-media/existing.mp4',
        'sort_order' => 0,
    ]);

    $this->actingAs($this->owner)
        ->post(route('manufacturer.products.media.store', $this->product), [
            'type' => ProductMediaType::Video->value,
            'file' => UploadedFile::fake()->create('new.mp4', 512, 'video/mp4'),
        ])
        ->assertSessionHasErrors([
            'file' => 'Apenas um vídeo é permitido por produto.',
        ]);

    expect($this->product->media()->where('type', ProductMediaType::Video->value)->count())->toBe(1);
});

// ──────────────────────────────────────────────
// Delete
// ──────────────────────────────────────────────

it('deletes a media item from a product', function () {
    Storage::disk('s3')->put('product-media/test.jpg', 'master');
    Storage::disk('s3')->put('product-media/test-thumb.jpg', 'thumbnail');

    $media = ProductMedia::create([
        'product_id' => $this->product->id,
        'type' => ProductMediaType::Image->value,
        'path' => 'product-media/test.jpg',
        'thumbnail_path' => 'product-media/test-thumb.jpg',
        'sort_order' => 0,
    ]);

    $this->actingAs($this->owner)
        ->delete(route('manufacturer.products.media.destroy', [$this->product, $media]))
        ->assertRedirect();

    $this->assertDatabaseMissing('product_media', ['id' => $media->id]);
    Storage::disk('s3')->assertMissing([
        'product-media/test.jpg',
        'product-media/test-thumb.jpg',
    ]);
});

it('denies deleting media from another product', function () {
    $otherProduct = Product::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
    ]);
    $media = ProductMedia::create([
        'product_id' => $otherProduct->id,
        'type' => ProductMediaType::Image->value,
        'path' => 'product-media/test.jpg',
        'sort_order' => 0,
    ]);

    $this->actingAs($this->owner)
        ->delete(route('manufacturer.products.media.destroy', [$this->product, $media]))
        ->assertNotFound();
});

// ──────────────────────────────────────────────
// Reorder
// ──────────────────────────────────────────────

it('reorders media items', function () {
    $media1 = ProductMedia::create([
        'product_id' => $this->product->id,
        'type' => ProductMediaType::Image->value,
        'path' => 'product-media/a.jpg',
        'sort_order' => 0,
    ]);
    $media2 = ProductMedia::create([
        'product_id' => $this->product->id,
        'type' => ProductMediaType::Image->value,
        'path' => 'product-media/b.jpg',
        'sort_order' => 1,
    ]);

    $this->actingAs($this->owner)
        ->put(route('manufacturer.products.media.order', $this->product), [
            'media_order' => [$media2->id, $media1->id],
        ])
        ->assertRedirect();

    expect($media1->fresh()->sort_order)->toBe(1);
    expect($media2->fresh()->sort_order)->toBe(0);
});
