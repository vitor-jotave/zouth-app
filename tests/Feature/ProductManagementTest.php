<?php

use App\Enums\UserType;
use App\Models\Manufacturer;
use App\Models\Plan;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\ProductColor;
use App\Models\ProductVariantStock;
use App\Models\User;

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
        'has_size_variants' => false,
        'has_color_variants' => false,
        'base_quantity' => 12,
        'is_active' => true,
        'sizes' => [],
        'colors' => [],
        'variant_stocks' => [],
    ];

    $response = $this->post('/manufacturer/products', $payload);

    $product = Product::first();

    $response->assertRedirect(route('manufacturer.products.edit', $product));

    $this->assertDatabaseHas('products', [
        'sku' => 'SKU-BASIC',
        'manufacturer_id' => $this->manufacturer->id,
        'base_quantity' => 12,
        'has_size_variants' => false,
        'has_color_variants' => false,
    ]);

    expect(ProductVariantStock::count())->toBe(0);
});

it('creates size-only variants with stock rows', function () {
    $payload = [
        'name' => 'Produto Tamanhos',
        'sku' => 'SKU-SIZE',
        'has_size_variants' => true,
        'has_color_variants' => false,
        'base_quantity' => 0,
        'sizes' => ['P', 'M'],
        'colors' => [],
        'variant_stocks' => [
            ['size' => 'P', 'quantity' => 5],
            ['size' => 'M', 'quantity' => 7],
        ],
    ];

    $response = $this->post('/manufacturer/products', $payload);

    $response->assertRedirect();

    $product = Product::first();

    expect($product->has_size_variants)->toBeTrue();
    expect($product->has_color_variants)->toBeFalse();
    expect($product->base_quantity)->toBe(0);
    expect($product->variantStocks)->toHaveCount(2);
    expect($product->variantStocks->pluck('product_color_id')->filter()->count())->toBe(0);
});

it('creates color-only variants with stock rows', function () {
    $payload = [
        'name' => 'Produto Cores',
        'sku' => 'SKU-COLOR',
        'has_size_variants' => false,
        'has_color_variants' => true,
        'base_quantity' => 0,
        'sizes' => [],
        'colors' => [
            ['name' => 'Preto', 'hex' => '#000000'],
            ['name' => 'Branco', 'hex' => '#FFFFFF'],
        ],
        'variant_stocks' => [
            ['color_name' => 'Preto', 'quantity' => 4],
            ['color_name' => 'Branco', 'quantity' => 6],
        ],
    ];

    $response = $this->post('/manufacturer/products', $payload);

    $response->assertRedirect();

    $product = Product::first();

    expect($product->has_color_variants)->toBeTrue();
    expect(ProductColor::where('product_id', $product->id)->count())->toBe(2);
    expect($product->variantStocks)->toHaveCount(2);
    expect($product->variantStocks->pluck('product_color_id')->filter()->count())->toBe(2);
});

it('creates size and color matrix variants', function () {
    $payload = [
        'name' => 'Produto Matriz',
        'sku' => 'SKU-MATRIX',
        'has_size_variants' => true,
        'has_color_variants' => true,
        'base_quantity' => 0,
        'sizes' => ['P', 'M'],
        'colors' => [
            ['name' => 'Azul', 'hex' => '#0000FF'],
            ['name' => 'Verde', 'hex' => '#00FF00'],
        ],
        'variant_stocks' => [
            ['size' => 'P', 'color_name' => 'Azul', 'quantity' => 2],
            ['size' => 'P', 'color_name' => 'Verde', 'quantity' => 3],
            ['size' => 'M', 'color_name' => 'Azul', 'quantity' => 4],
            ['size' => 'M', 'color_name' => 'Verde', 'quantity' => 5],
        ],
    ];

    $response = $this->post('/manufacturer/products', $payload);

    $response->assertRedirect();

    $product = Product::first();

    expect($product->variantStocks)->toHaveCount(4);
});

it('rejects inconsistent variant payloads', function () {
    $payload = [
        'name' => 'Produto Invalido',
        'sku' => 'SKU-INVALID',
        'has_size_variants' => false,
        'has_color_variants' => false,
        'base_quantity' => 10,
        'sizes' => [],
        'colors' => [
            ['name' => 'Preto', 'hex' => '#000000'],
        ],
        'variant_stocks' => [],
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
        'has_size_variants' => false,
        'has_color_variants' => false,
        'base_quantity' => 1,
        'sizes' => [],
        'colors' => [],
        'variant_stocks' => [],
    ]);

    $response->assertForbidden();
});
