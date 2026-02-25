<?php

use App\Enums\UserType;
use App\Models\Manufacturer;
use App\Models\Plan;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\ProductVariantStock;
use App\Models\User;
use App\Models\VariationType;
use App\Models\VariationValue;

beforeEach(function () {
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

    $this->actingAs($this->owner);
});

it('creates a product without variants', function () {
    $category = ProductCategory::factory()->forManufacturer($this->manufacturer)->create();

    $payload = [
        'name' => 'Produto Basico',
        'sku' => 'SKU-BASIC',
        'description' => 'Produto simples',
        'product_category_id' => $category->id,
        'base_quantity' => 12,
        'is_active' => true,
        'variations' => [],
        'variant_stocks' => [],
    ];

    $response = $this->post('/manufacturer/products', $payload);

    $response->assertRedirect(route('manufacturer.products.index'));

    $this->assertDatabaseHas('products', [
        'sku' => 'SKU-BASIC',
        'manufacturer_id' => $this->manufacturer->id,
        'base_quantity' => 12,
    ]);

    expect(ProductVariantStock::count())->toBe(0);
});

it('creates single-type variants with stock rows', function () {
    $sizeType = VariationType::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'name' => 'Tamanho',
    ]);
    VariationValue::factory()->create(['variation_type_id' => $sizeType->id, 'value' => 'P']);
    VariationValue::factory()->create(['variation_type_id' => $sizeType->id, 'value' => 'M']);

    $payload = [
        'name' => 'Produto Tamanhos',
        'sku' => 'SKU-SIZE',
        'base_quantity' => 0,
        'variations' => [
            ['variation_type_id' => $sizeType->id, 'values' => ['P', 'M']],
        ],
        'variant_stocks' => [
            ['variation_key' => ['Tamanho' => 'P'], 'quantity' => 5],
            ['variation_key' => ['Tamanho' => 'M'], 'quantity' => 7],
        ],
    ];

    $response = $this->post('/manufacturer/products', $payload);

    $response->assertRedirect();

    $product = Product::first();

    expect($product->hasVariations())->toBeTrue();
    expect($product->base_quantity)->toBe(0);
    expect($product->variantStocks)->toHaveCount(2);
    expect($product->productVariations)->toHaveCount(1);
});

it('creates multi-type matrix variants with stock rows', function () {
    $sizeType = VariationType::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'name' => 'Tamanho',
    ]);
    VariationValue::factory()->create(['variation_type_id' => $sizeType->id, 'value' => 'P']);
    VariationValue::factory()->create(['variation_type_id' => $sizeType->id, 'value' => 'M']);

    $colorType = VariationType::factory()->colorType()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'name' => 'Cor',
    ]);
    VariationValue::factory()->create(['variation_type_id' => $colorType->id, 'value' => 'Azul', 'hex' => '#0000FF']);
    VariationValue::factory()->create(['variation_type_id' => $colorType->id, 'value' => 'Verde', 'hex' => '#00FF00']);

    $payload = [
        'name' => 'Produto Matriz',
        'sku' => 'SKU-MATRIX',
        'base_quantity' => 0,
        'variations' => [
            ['variation_type_id' => $sizeType->id, 'values' => ['P', 'M']],
            ['variation_type_id' => $colorType->id, 'values' => ['Azul', 'Verde']],
        ],
        'variant_stocks' => [
            ['variation_key' => ['Tamanho' => 'P', 'Cor' => 'Azul'], 'quantity' => 2],
            ['variation_key' => ['Tamanho' => 'P', 'Cor' => 'Verde'], 'quantity' => 3],
            ['variation_key' => ['Tamanho' => 'M', 'Cor' => 'Azul'], 'quantity' => 4],
            ['variation_key' => ['Tamanho' => 'M', 'Cor' => 'Verde'], 'quantity' => 5],
        ],
    ];

    $response = $this->post('/manufacturer/products', $payload);

    $response->assertRedirect();

    $product = Product::first();

    expect($product->variantStocks)->toHaveCount(4);
    expect($product->productVariations)->toHaveCount(2);
});

it('rejects variant stocks when no variations are selected', function () {
    $payload = [
        'name' => 'Produto Invalido',
        'sku' => 'SKU-INVALID',
        'base_quantity' => 10,
        'variations' => [],
        'variant_stocks' => [
            ['variation_key' => ['Tamanho' => 'P'], 'quantity' => 5],
        ],
    ];

    $response = $this->post('/manufacturer/products', $payload);

    $response->assertSessionHasErrors();
});

it('prevents cross-tenant product access', function () {
    $product = Product::factory()->forManufacturer($this->manufacturer)->withoutCategory()->create();

    $otherManufacturer = Manufacturer::factory()->create(['is_active' => true]);
    $otherUser = User::factory()->create([
        'user_type' => UserType::ManufacturerUser,
        'current_manufacturer_id' => $otherManufacturer->id,
    ]);
    $otherManufacturer->users()->attach($otherUser->id, [
        'role' => 'owner',
        'status' => 'active',
    ]);

    $this->actingAs($otherUser);

    $response = $this->put('/manufacturer/products/'.$product->id, [
        'name' => 'Produto Bloqueado',
        'sku' => 'SKU-BLOCK',
        'base_quantity' => 1,
        'variations' => [],
        'variant_stocks' => [],
    ]);

    $response->assertForbidden();
});
