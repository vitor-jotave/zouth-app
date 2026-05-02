<?php

use App\Enums\UserType;
use App\Models\CatalogSetting;
use App\Models\Manufacturer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Plan;
use App\Models\Product;
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

    $this->validPublicOrderCustomerData = fn (array $overrides = []) => [
        'customer_name' => 'Cliente Preco',
        'customer_phone' => '(11) 99999-9999',
        'customer_document_type' => 'cpf',
        'customer_document' => '529.982.247-25',
        'customer_zip_code' => '01001-000',
        'customer_state' => 'SP',
        'customer_city' => 'Sao Paulo',
        'customer_neighborhood' => 'Se',
        'customer_street' => 'Praca da Se',
        'customer_address_number' => '100',
        ...$overrides,
    ];
});

// ──────────────────────────────────────────────
// Store: price normalization
// ──────────────────────────────────────────────

it('stores a product with comma-separated price converting to cents', function () {
    $response = $this->post('/manufacturer/products', [
        'name' => 'Produto Preco Virgula',
        'sku' => 'SKU-PRICE-COMMA',
        'base_quantity' => 10,
        'price' => '12,90',
        'variations' => [],
        'variant_stocks' => [],
    ]);

    $response->assertRedirect();

    $this->assertDatabaseHas('products', [
        'sku' => 'SKU-PRICE-COMMA',
        'price_cents' => 1290,
    ]);
});

it('stores a product with dot-separated price converting to cents', function () {
    $response = $this->post('/manufacturer/products', [
        'name' => 'Produto Preco Ponto',
        'sku' => 'SKU-PRICE-DOT',
        'base_quantity' => 10,
        'price' => '99.50',
        'variations' => [],
        'variant_stocks' => [],
    ]);

    $response->assertRedirect();

    $this->assertDatabaseHas('products', [
        'sku' => 'SKU-PRICE-DOT',
        'price_cents' => 9950,
    ]);
});

it('stores a product with null price when field is empty', function () {
    $response = $this->post('/manufacturer/products', [
        'name' => 'Produto Sem Preco',
        'sku' => 'SKU-NO-PRICE',
        'base_quantity' => 5,
        'price' => '',
        'variations' => [],
        'variant_stocks' => [],
    ]);

    $response->assertRedirect();

    $product = Product::where('sku', 'SKU-NO-PRICE')->first();

    expect($product)->not->toBeNull();
    expect($product->price_cents)->toBeNull();
});

it('stores a product with null price when field is omitted', function () {
    $response = $this->post('/manufacturer/products', [
        'name' => 'Produto Omitido Preco',
        'sku' => 'SKU-OMIT-PRICE',
        'base_quantity' => 5,
        'variations' => [],
        'variant_stocks' => [],
    ]);

    $response->assertRedirect();

    $product = Product::where('sku', 'SKU-OMIT-PRICE')->first();

    expect($product)->not->toBeNull();
    expect($product->price_cents)->toBeNull();
});

// ──────────────────────────────────────────────
// Update: price normalization
// ──────────────────────────────────────────────

it('updates a product price correctly', function () {
    $product = Product::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'price_cents' => 1000,
    ]);

    $response = $this->put("/manufacturer/products/{$product->id}", [
        'name' => $product->name,
        'sku' => $product->sku,
        'base_quantity' => $product->base_quantity,
        'price' => '25,00',
        'variations' => [],
        'variant_stocks' => [],
    ]);

    $response->assertRedirect();

    expect($product->fresh()->price_cents)->toBe(2500);
});

it('clears product price when empty string is sent', function () {
    $product = Product::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'price_cents' => 1290,
    ]);

    $response = $this->put("/manufacturer/products/{$product->id}", [
        'name' => $product->name,
        'sku' => $product->sku,
        'base_quantity' => $product->base_quantity,
        'price' => '',
        'variations' => [],
        'variant_stocks' => [],
    ]);

    $response->assertRedirect();

    expect($product->fresh()->price_cents)->toBeNull();
});

// ──────────────────────────────────────────────
// Validation: invalid prices
// ──────────────────────────────────────────────

it('rejects a negative price', function () {
    $response = $this->post('/manufacturer/products', [
        'name' => 'Produto Negativo',
        'sku' => 'SKU-NEG',
        'base_quantity' => 1,
        'price' => '-10',
        'variations' => [],
        'variant_stocks' => [],
    ]);

    $response->assertSessionHasErrors('price');
});

it('rejects a non-numeric price', function () {
    $response = $this->post('/manufacturer/products', [
        'name' => 'Produto Texto',
        'sku' => 'SKU-TXT',
        'base_quantity' => 1,
        'price' => 'abc',
        'variations' => [],
        'variant_stocks' => [],
    ]);

    $response->assertSessionHasErrors('price');
});

it('rejects a price above the maximum', function () {
    $response = $this->post('/manufacturer/products', [
        'name' => 'Produto Caro',
        'sku' => 'SKU-MAX',
        'base_quantity' => 1,
        'price' => '1000000.00',
        'variations' => [],
        'variant_stocks' => [],
    ]);

    $response->assertSessionHasErrors('price');
});

// ──────────────────────────────────────────────
// Order: unit_price snapshot
// ──────────────────────────────────────────────

it('snapshots unit_price from product price_cents when creating an order', function () {
    $this->withoutVite();

    $catalogSetting = CatalogSetting::create([
        'manufacturer_id' => $this->manufacturer->id,
        ...CatalogSetting::defaults($this->manufacturer->name),
        'public_link_active' => true,
    ]);

    $product = Product::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'is_active' => true,
        'price_cents' => 4990,
    ]);

    $response = $this->post(
        "/catalog/{$catalogSetting->public_token}/orders",
        ($this->validPublicOrderCustomerData)([
            'customer_name' => 'Cliente Preco',
            'customer_email' => 'preco@test.com',
            'items' => [
                ['product_id' => $product->id, 'quantity' => 3],
            ],
        ]),
    );

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    $order = Order::first();
    expect($order)->not->toBeNull();

    $item = OrderItem::where('order_id', $order->id)->first();
    expect($item->unit_price)->not->toBeNull();
    expect((float) $item->unit_price)->toBe(49.90);
});

it('keeps unit_price null when product has no price', function () {
    $this->withoutVite();

    $catalogSetting = CatalogSetting::create([
        'manufacturer_id' => $this->manufacturer->id,
        ...CatalogSetting::defaults($this->manufacturer->name),
        'public_link_active' => true,
    ]);

    $product = Product::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'is_active' => true,
        'price_cents' => null,
    ]);

    $response = $this->post(
        "/catalog/{$catalogSetting->public_token}/orders",
        ($this->validPublicOrderCustomerData)([
            'customer_name' => 'Cliente Sem Preco',
            'customer_email' => 'sempreco@test.com',
            'items' => [
                ['product_id' => $product->id, 'quantity' => 1],
            ],
        ]),
    );

    $order = Order::first();
    expect($order)->not->toBeNull();

    $item = OrderItem::where('order_id', $order->id)->first();
    expect($item->unit_price)->toBeNull();
});

// ──────────────────────────────────────────────
// Resource: price_cents in API response
// ──────────────────────────────────────────────

it('returns price_cents in the product resource', function () {
    $this->withoutVite();

    Product::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'price_cents' => 5990,
    ]);

    $response = $this->get('/manufacturer/products');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('manufacturer/products/index')
        ->has('products.data.0', fn ($product) => $product
            ->where('price_cents', 5990)
            ->etc()
        )
    );
});
