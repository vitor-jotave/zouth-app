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
        'description' => 'Produto simples',
        'base_quantity' => 12,
    ]);

    expect(ProductVariantStock::count())->toBe(0);
});

it('stores and normalizes a product video link', function () {
    $response = $this->post(route('manufacturer.products.store'), [
        'name' => 'Vestido em movimento',
        'sku' => 'SKU-VIDEO',
        'video_url' => 'https://youtu.be/dQw4w9WgXcQ?t=10',
        'base_quantity' => 8,
        'variations' => [],
        'variant_stocks' => [],
    ]);

    $response->assertRedirect(route('manufacturer.products.index'));

    $this->assertDatabaseHas('products', [
        'manufacturer_id' => $this->manufacturer->id,
        'sku' => 'SKU-VIDEO',
        'video_url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    ]);
});

it('rejects an unsupported product video link', function () {
    $response = $this->post(route('manufacturer.products.store'), [
        'name' => 'Vestido sem vídeo válido',
        'sku' => 'SKU-VIDEO-INVALID',
        'video_url' => 'https://example.com/watch/collection',
        'base_quantity' => 8,
        'variations' => [],
        'variant_stocks' => [],
    ]);

    $response->assertSessionHasErrors('video_url');

    $this->assertDatabaseMissing('products', [
        'manufacturer_id' => $this->manufacturer->id,
        'sku' => 'SKU-VIDEO-INVALID',
    ]);
});

it('persists whether an out of stock product can receive quote requests', function () {
    $payload = [
        'name' => 'Peça sob orçamento',
        'sku' => 'SKU-QUOTE',
        'base_quantity' => 0,
        'is_active' => true,
        'allow_quote_when_out_of_stock' => true,
        'variations' => [],
        'variant_stocks' => [],
    ];

    $this->post('/manufacturer/products', $payload)->assertRedirect();

    $product = Product::query()->where('sku', 'SKU-QUOTE')->firstOrFail();

    expect($product->allow_quote_when_out_of_stock)->toBeTrue();

    $this->get(route('manufacturer.products.edit', $product))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('product.allow_quote_when_out_of_stock', true)
        );

    $this->put(route('manufacturer.products.update', $product), [
        ...$payload,
        'allow_quote_when_out_of_stock' => false,
    ])->assertRedirect();

    expect($product->fresh()->allow_quote_when_out_of_stock)->toBeFalse();
});

it('updates and reloads product description', function () {
    $product = Product::factory()->forManufacturer($this->manufacturer)->withoutCategory()->create([
        'description' => null,
        'base_quantity' => 8,
    ]);

    $response = $this->put('/manufacturer/products/'.$product->id, [
        'name' => $product->name,
        'sku' => $product->sku,
        'description' => 'Descrição atualizada do produto.',
        'base_quantity' => 8,
        'variations' => [],
        'variant_stocks' => [],
    ]);

    $response->assertRedirect(route('manufacturer.products.index'));

    $this->assertDatabaseHas('products', [
        'id' => $product->id,
        'description' => 'Descrição atualizada do produto.',
    ]);

    $this->get('/manufacturer/products/'.$product->id.'/edit')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('product.description', 'Descrição atualizada do produto.')
        );
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

it('reopens only variation values that are actually used by stock combinations', function () {
    $sizeType = VariationType::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'name' => 'Tamanho',
    ]);
    VariationValue::factory()->create([
        'variation_type_id' => $sizeType->id,
        'value' => 'P',
        'display_order' => 10,
    ]);
    VariationValue::factory()->create([
        'variation_type_id' => $sizeType->id,
        'value' => 'M',
        'display_order' => 20,
    ]);
    VariationValue::factory()->create([
        'variation_type_id' => $sizeType->id,
        'value' => 'G',
        'display_order' => 30,
    ]);

    $product = Product::factory()->forManufacturer($this->manufacturer)->withoutCategory()->create([
        'base_quantity' => 0,
    ]);
    $product->productVariations()->create(['variation_type_id' => $sizeType->id]);
    $product->variantStocks()->createMany([
        ['variation_key' => ['Tamanho' => 'G'], 'quantity' => 2],
        ['variation_key' => ['Tamanho' => 'P'], 'quantity' => 4],
    ]);

    $response = $this->get(route('manufacturer.products.edit', $product))
        ->assertSuccessful();

    expect(collect($response->inertiaProps('stock_structure.variations.0.values'))->pluck('value')->all())
        ->toBe(['P', 'G']);
});

it('preserves an existing variant stock id when updating the same combination', function () {
    $sizeType = VariationType::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'name' => 'Tamanho',
    ]);
    VariationValue::factory()->create(['variation_type_id' => $sizeType->id, 'value' => 'P']);

    $colorType = VariationType::factory()->colorType()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'name' => 'Cor',
    ]);
    VariationValue::factory()->create(['variation_type_id' => $colorType->id, 'value' => 'Azul']);

    $product = Product::factory()->forManufacturer($this->manufacturer)->withoutCategory()->create([
        'base_quantity' => 0,
    ]);
    $product->productVariations()->createMany([
        ['variation_type_id' => $sizeType->id],
        ['variation_type_id' => $colorType->id],
    ]);
    $stock = $product->variantStocks()->create([
        'variation_key' => ['Cor' => 'Azul', 'Tamanho' => 'P'],
        'quantity' => 3,
        'price_cents' => 1290,
        'sku_variant' => 'AZ-P',
    ]);

    $this->put(route('manufacturer.products.update', $product), [
        'name' => $product->name,
        'sku' => $product->sku,
        'base_quantity' => 0,
        'variations' => [
            ['variation_type_id' => $sizeType->id, 'values' => ['P']],
            ['variation_type_id' => $colorType->id, 'values' => ['Azul']],
        ],
        'variant_stocks' => [[
            'variation_key' => ['Tamanho' => 'P', 'Cor' => 'Azul'],
            'quantity' => 8,
            'price_cents' => 1490,
            'sku_variant' => 'AZ-P-NEW',
        ]],
    ])->assertRedirect();

    expect($product->variantStocks()->sole())
        ->id->toBe($stock->id)
        ->quantity->toBe(8)
        ->price_cents->toBe(1490)
        ->sku_variant->toBe('AZ-P-NEW');
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

it('filters products by active status without treating an empty value as inactive', function () {
    $activeProduct = Product::factory()->forManufacturer($this->manufacturer)->withoutCategory()->create([
        'name' => 'Produto ativo',
        'is_active' => true,
        'sort_order' => 1,
    ]);
    $inactiveProduct = Product::factory()->forManufacturer($this->manufacturer)->withoutCategory()->create([
        'name' => 'Produto inativo',
        'is_active' => false,
        'sort_order' => 2,
    ]);

    $otherManufacturer = Manufacturer::factory()->create(['is_active' => true]);
    $otherProduct = Product::factory()->forManufacturer($otherManufacturer)->withoutCategory()->create([
        'is_active' => true,
        'sort_order' => 0,
    ]);

    $allResponse = $this->get(route('manufacturer.products.index', ['is_active' => '']))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('manufacturer/products/index')
            ->has('products.data', 2)
        );

    $activeResponse = $this->get(route('manufacturer.products.index', ['is_active' => 'true']))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('manufacturer/products/index')
            ->has('products.data', 1)
            ->where('products.data.0.id', $activeProduct->id)
            ->where('products.data.0.is_active', true)
        );

    $inactiveResponse = $this->get(route('manufacturer.products.index', ['is_active' => 'false']))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('manufacturer/products/index')
            ->has('products.data', 1)
            ->where('products.data.0.id', $inactiveProduct->id)
            ->where('products.data.0.is_active', false)
        );

    expect(collect($allResponse->inertiaProps('products.data'))->pluck('id')->all())
        ->toBe([$activeProduct->id, $inactiveProduct->id])
        ->not->toContain($otherProduct->id)
        ->and(collect($activeResponse->inertiaProps('products.data'))->pluck('id'))
        ->not->toContain($otherProduct->id)
        ->and(collect($inactiveResponse->inertiaProps('products.data'))->pluck('id'))
        ->not->toContain($otherProduct->id);
});
