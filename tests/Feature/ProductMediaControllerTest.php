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

    expect(ProductMedia::where('product_id', $this->product->id)->count())->toBe(2);
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

// ──────────────────────────────────────────────
// Delete
// ──────────────────────────────────────────────

it('deletes a media item from a product', function () {
    $media = ProductMedia::create([
        'product_id' => $this->product->id,
        'type' => ProductMediaType::Image->value,
        'path' => 'product-media/test.jpg',
        'sort_order' => 0,
    ]);

    $this->actingAs($this->owner)
        ->delete(route('manufacturer.products.media.destroy', [$this->product, $media]))
        ->assertRedirect();

    $this->assertDatabaseMissing('product_media', ['id' => $media->id]);
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
