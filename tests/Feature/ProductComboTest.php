<?php

use App\Enums\UserType;
use App\Models\CatalogSetting;
use App\Models\Manufacturer;
use App\Models\Order;
use App\Models\Plan;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\ProductVariantStock;
use App\Models\ProductVariation;
use App\Models\User;
use App\Models\VariationType;
use App\Models\VariationValue;

beforeEach(function () {
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

    $this->actingAs($this->owner);
});

function comboPayload(array $overrides = []): array
{
    return [
        'name' => 'Combo Primeira Saida',
        'sku' => 'COMBO-001',
        'description' => 'Body e calca coordenados.',
        'product_category_id' => null,
        'price' => '129,90',
        'is_active' => true,
        'sort_order' => 0,
        'combo_items' => [],
        ...$overrides,
    ];
}

function validPublicCustomerData(array $overrides = []): array
{
    return [
        'customer_name' => 'Cliente Combo',
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
}

it('creates a sellable combo with component products', function () {
    $category = ProductCategory::factory()->forManufacturer($this->manufacturer)->create();
    $body = Product::factory()->forManufacturer($this->manufacturer)->create([
        'name' => 'Body Branco',
        'sku' => 'BODY-BR',
        'base_quantity' => 10,
        'is_active' => true,
    ]);
    $pants = Product::factory()->forManufacturer($this->manufacturer)->create([
        'name' => 'Calca Azul',
        'sku' => 'CALCA-AZ',
        'base_quantity' => 6,
        'is_active' => true,
    ]);

    $response = $this->post('/manufacturer/products/combos', comboPayload([
        'product_category_id' => $category->id,
        'combo_items' => [
            ['component_product_id' => $body->id, 'quantity' => 2],
            ['component_product_id' => $pants->id, 'quantity' => 1],
        ],
    ]));

    $response->assertRedirect(route('manufacturer.products.index'));

    $combo = Product::where('sku', 'COMBO-001')->first();

    expect($combo)->not->toBeNull();
    expect($combo->product_type)->toBe('combo');
    expect($combo->price_cents)->toBe(12990);
    expect($combo->getTotalStock())->toBe(5);
    expect($combo->comboItems)->toHaveCount(2);

    $this->assertDatabaseHas('product_combo_items', [
        'combo_product_id' => $combo->id,
        'component_product_id' => $body->id,
        'quantity' => 2,
    ]);
});

it('creates a combo using a specific product variation stock', function () {
    $sizeType = VariationType::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'name' => 'Tamanho',
    ]);
    VariationValue::factory()->create(['variation_type_id' => $sizeType->id, 'value' => 'P']);
    VariationValue::factory()->create(['variation_type_id' => $sizeType->id, 'value' => 'M']);

    $shirt = Product::factory()->forManufacturer($this->manufacturer)->create([
        'name' => 'Camiseta',
        'sku' => 'CAMISETA',
        'base_quantity' => 0,
        'is_active' => true,
    ]);
    ProductVariation::create([
        'product_id' => $shirt->id,
        'variation_type_id' => $sizeType->id,
    ]);
    $smallStock = ProductVariantStock::factory()->create([
        'product_id' => $shirt->id,
        'variation_key' => ['Tamanho' => 'P'],
        'quantity' => 8,
    ]);
    ProductVariantStock::factory()->create([
        'product_id' => $shirt->id,
        'variation_key' => ['Tamanho' => 'M'],
        'quantity' => 2,
    ]);

    $this->post('/manufacturer/products/combos', comboPayload([
        'combo_items' => [
            [
                'component_product_id' => $shirt->id,
                'component_variant_stock_id' => $smallStock->id,
                'quantity' => 3,
            ],
        ],
    ]))->assertRedirect();

    $combo = Product::where('sku', 'COMBO-001')->first();

    expect($combo->getTotalStock())->toBe(2);
    expect($combo->comboItems->first()->variation_key)->toBe(['Tamanho' => 'P']);
});

it('validates combo component ownership, recursion, price and required variation', function () {
    $plainProduct = Product::factory()->forManufacturer($this->manufacturer)->create(['is_active' => true]);
    $foreignProduct = Product::factory()->create(['is_active' => true]);
    $existingCombo = Product::factory()->forManufacturer($this->manufacturer)->create([
        'product_type' => 'combo',
        'is_active' => true,
    ]);
    $sizeType = VariationType::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'name' => 'Tamanho',
    ]);
    VariationValue::factory()->create(['variation_type_id' => $sizeType->id, 'value' => 'P']);
    $variantProduct = Product::factory()->forManufacturer($this->manufacturer)->create([
        'base_quantity' => 0,
        'is_active' => true,
    ]);
    ProductVariation::create([
        'product_id' => $variantProduct->id,
        'variation_type_id' => $sizeType->id,
    ]);
    ProductVariantStock::factory()->create([
        'product_id' => $variantProduct->id,
        'variation_key' => ['Tamanho' => 'P'],
        'quantity' => 5,
    ]);

    $this->post('/manufacturer/products/combos', comboPayload([
        'price' => '',
        'combo_items' => [['component_product_id' => $plainProduct->id, 'quantity' => 1]],
    ]))->assertSessionHasErrors('price');

    $this->post('/manufacturer/products/combos', comboPayload([
        'combo_items' => [['component_product_id' => $foreignProduct->id, 'quantity' => 1]],
    ]))->assertSessionHasErrors('combo_items.0.component_product_id');

    $this->post('/manufacturer/products/combos', comboPayload([
        'combo_items' => [['component_product_id' => $existingCombo->id, 'quantity' => 1]],
    ]))->assertSessionHasErrors('combo_items.0.component_product_id');

    $this->post('/manufacturer/products/combos', comboPayload([
        'combo_items' => [['component_product_id' => $variantProduct->id, 'quantity' => 1]],
    ]))->assertSessionHasErrors('combo_items.0.component_variant_stock_id');
});

it('lists combos in the product index and public catalog', function () {
    $component = Product::factory()->forManufacturer($this->manufacturer)->create([
        'name' => 'Body Avulso',
        'base_quantity' => 9,
        'is_active' => true,
    ]);
    $combo = Product::factory()->forManufacturer($this->manufacturer)->create([
        'name' => 'Combo Catalogo',
        'sku' => 'COMBO-CAT',
        'product_type' => 'combo',
        'price_cents' => 7990,
        'base_quantity' => 0,
        'is_active' => true,
    ]);
    $combo->comboItems()->create([
        'component_product_id' => $component->id,
        'quantity' => 3,
    ]);
    $catalogSetting = CatalogSetting::create([
        'manufacturer_id' => $this->manufacturer->id,
        ...CatalogSetting::defaults($this->manufacturer->name),
        'public_link_active' => true,
    ]);

    $this->get('/manufacturer/products')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('manufacturer/products/index')
            ->where('products.data.1.product_type', 'combo')
        );

    $this->get("/catalog/{$catalogSetting->public_token}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('public/catalog')
            ->where('products.data.1.product_type', 'combo')
            ->where('products.data.1.combo_items.0.product_name', 'Body Avulso')
            ->where('products.data.1.total_stock', 3)
        );
});

it('creates a public order with combo price and composition snapshot', function () {
    $component = Product::factory()->forManufacturer($this->manufacturer)->create([
        'name' => 'Body Avulso',
        'sku' => 'BODY-SNAP',
        'base_quantity' => 9,
        'is_active' => true,
    ]);
    $combo = Product::factory()->forManufacturer($this->manufacturer)->create([
        'name' => 'Combo Pedido',
        'sku' => 'COMBO-PED',
        'product_type' => 'combo',
        'price_cents' => 9990,
        'base_quantity' => 0,
        'is_active' => true,
    ]);
    $combo->comboItems()->create([
        'component_product_id' => $component->id,
        'quantity' => 3,
    ]);
    $catalogSetting = CatalogSetting::create([
        'manufacturer_id' => $this->manufacturer->id,
        ...CatalogSetting::defaults($this->manufacturer->name),
        'public_link_active' => true,
    ]);

    $this->post(
        "/catalog/{$catalogSetting->public_token}/orders",
        validPublicCustomerData([
            'items' => [['product_id' => $combo->id, 'quantity' => 2]],
        ]),
    )->assertRedirect();

    $order = Order::with('items')->first();
    $item = $order->items->first();

    expect((float) $item->unit_price)->toBe(99.90);
    expect($item->combo_components)->toBe([
        [
            'product_id' => $component->id,
            'product_name' => 'Body Avulso',
            'product_sku' => 'BODY-SNAP',
            'variation_key' => null,
            'quantity' => 3,
        ],
    ]);

    $this->get("/o/{$order->public_token}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('order.items.0.combo_components.0.product_name', 'Body Avulso')
        );
});
