<?php

use App\Enums\OrderStatus;
use App\Enums\OrderType;
use App\Enums\UserType;
use App\Models\CatalogSetting;
use App\Models\Manufacturer;
use App\Models\ManufacturerAffiliation;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderStatusHistory;
use App\Models\Plan;
use App\Models\Product;
use App\Models\ProductMedia;
use App\Models\ProductVariantStock;
use App\Models\ProductVariation;
use App\Models\User;
use App\Models\VariationType;

// ──────────────────────────────────────────────
// Setup
// ──────────────────────────────────────────────

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

    $this->catalogSetting = CatalogSetting::create([
        'manufacturer_id' => $this->manufacturer->id,
        ...CatalogSetting::defaults($this->manufacturer->name),
        'public_link_active' => true,
    ]);

    $this->product1 = Product::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'is_active' => true,
    ]);
    $this->product2 = Product::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'is_active' => true,
    ]);

    $this->validCustomerData = fn (array $overrides = []) => [
        'customer_name' => 'Cliente Teste',
        'customer_phone' => '(11) 99999-9999',
        'customer_document_type' => 'cpf',
        'customer_document' => '529.982.247-25',
        'customer_zip_code' => '01001-000',
        'customer_state' => 'SP',
        'customer_city' => 'Sao Paulo',
        'customer_neighborhood' => 'Se',
        'customer_street' => 'Praca da Se',
        'customer_address_number' => '100',
        'customer_address_complement' => 'Sala 2',
        'customer_address_reference' => 'Referência de Entrega',
        ...$overrides,
    ];
});

// ──────────────────────────────────────────────
// Public order creation
// ──────────────────────────────────────────────

it('creates an order via the public catalog endpoint', function () {
    $response = $this->post(
        "/catalog/{$this->catalogSetting->public_token}/orders",
        ($this->validCustomerData)([
            'items' => [
                ['product_id' => $this->product1->id, 'quantity' => 2],
                ['product_id' => $this->product2->id, 'quantity' => 1, 'size' => 'M', 'color' => 'Azul'],
            ],
        ]),
    );

    $order = Order::first();

    expect($order)->not->toBeNull();
    expect($order->manufacturer_id)->toBe($this->manufacturer->id);
    expect($order->status)->toBe(OrderStatus::New);
    expect($order->customer_name)->toBe('Cliente Teste');
    expect($order->customer_phone)->toBe('(11) 99999-9999');
    expect($order->customer_document_type)->toBe('cpf');
    expect($order->customer_document)->toBe('52998224725');
    expect($order->customer_zip_code)->toBe('01001000');
    expect($order->customer_state)->toBe('SP');
    expect($order->customer_city)->toBe('Sao Paulo');
    expect($order->customer_neighborhood)->toBe('Se');
    expect($order->customer_street)->toBe('Praca da Se');
    expect($order->customer_address_number)->toBe('100');
    expect($order->customer_address_complement)->toBe('Sala 2');
    expect($order->customer_address_reference)->toBe('Referência de Entrega');
    expect($order->public_token)->toHaveLength(48);

    expect(OrderItem::where('order_id', $order->id)->count())->toBe(2);

    $item1 = OrderItem::where('order_id', $order->id)
        ->where('product_id', $this->product1->id)
        ->first();
    expect($item1->quantity)->toBe(2);
    expect($item1->product_name)->toBe($this->product1->name);

    $item2 = OrderItem::where('order_id', $order->id)
        ->where('product_id', $this->product2->id)
        ->first();
    expect($item2->size)->toBe('M');
    expect($item2->color)->toBe('Azul');

    // Should have initial status history entry
    expect(OrderStatusHistory::where('order_id', $order->id)->count())->toBe(1);
    expect($order->inventory_reserved_at)->not->toBeNull();
    expect($this->product1->fresh()->base_quantity)->toBe(18);
    expect($this->product2->fresh()->base_quantity)->toBe(19);

    $response->assertRedirect(route('public.order.show', $order->public_token));
});

it('depletes the available stock when the order consumes every unit', function () {
    $this->product1->update(['base_quantity' => 10]);

    $this->post(
        "/catalog/{$this->catalogSetting->public_token}/orders",
        ($this->validCustomerData)([
            'items' => [['product_id' => $this->product1->id, 'quantity' => 10]],
        ]),
    )->assertRedirect();

    expect($this->product1->fresh()->base_quantity)->toBe(0)
        ->and(Order::query()->firstOrFail()->inventory_reserved_at)->not->toBeNull();
});

it('reserves the selected variant stock and snapshots its price and options', function () {
    $variationType = VariationType::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'name' => 'Estampa',
    ]);
    ProductVariation::create([
        'product_id' => $this->product1->id,
        'variation_type_id' => $variationType->id,
    ]);
    $this->product1->update(['base_quantity' => 0, 'price_cents' => 1290]);
    $variantStock = ProductVariantStock::factory()->create([
        'product_id' => $this->product1->id,
        'variation_key' => ['Estampa' => 'Bolinhas'],
        'quantity' => 3,
        'price_cents' => 1590,
    ]);

    $this->post(
        "/catalog/{$this->catalogSetting->public_token}/orders",
        ($this->validCustomerData)([
            'items' => [[
                'product_id' => $this->product1->id,
                'quantity' => 2,
                'selected_variations' => ['Estampa' => 'Bolinhas'],
            ]],
        ]),
    )->assertRedirect();

    $item = OrderItem::first();

    expect($variantStock->fresh()->quantity)->toBe(1)
        ->and($item->product_variant_stock_id)->toBe($variantStock->id)
        ->and($item->selected_variations)->toBe(['Estampa' => 'Bolinhas'])
        ->and((float) $item->unit_price)->toBe(15.90);
});

it('rejects an order when the requested stock is unavailable', function () {
    $this->product1->update(['base_quantity' => 1]);

    $this->post(
        "/catalog/{$this->catalogSetting->public_token}/orders",
        ($this->validCustomerData)([
            'items' => [['product_id' => $this->product1->id, 'quantity' => 2]],
        ]),
    )->assertSessionHasErrors('items');

    expect(Order::count())->toBe(0)
        ->and($this->product1->fresh()->base_quantity)->toBe(1);
});

it('creates a quote request without document address customer or stock reservation', function () {
    $this->product1->update([
        'base_quantity' => 0,
        'allow_quote_when_out_of_stock' => true,
    ]);

    $response = $this->post(
        "/catalog/{$this->catalogSetting->public_token}/orders",
        [
            'request_quote' => true,
            'customer_name' => 'Loja interessada',
            'customer_email' => 'compras@lojainfantil.test',
            'items' => [['product_id' => $this->product1->id, 'quantity' => 12]],
        ],
    );

    $order = Order::query()->firstOrFail();

    expect($order->order_type)->toBe(OrderType::Quote)
        ->and($order->customer_id)->toBeNull()
        ->and($order->customer_document)->toBeNull()
        ->and($order->customer_street)->toBeNull()
        ->and($order->inventory_reserved_at)->toBeNull()
        ->and($this->product1->fresh()->base_quantity)->toBe(0)
        ->and($order->items)->toHaveCount(1)
        ->and($order->items->first()->quantity)->toBe(12);

    $response->assertRedirect(route('public.order.show', $order->public_token));

    $this->get(route('public.order.show', $order->public_token))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('order.order_type', OrderType::Quote->value)
            ->where('order.order_type_label', 'Orçamento')
            ->where('order.status_label', 'Recebido')
        );
});

it('does not reserve any item when one product turns the cart into a quote', function () {
    $this->product1->update([
        'base_quantity' => 0,
        'allow_quote_when_out_of_stock' => true,
    ]);
    $this->product2->update(['base_quantity' => 5]);

    $this->post(
        "/catalog/{$this->catalogSetting->public_token}/orders",
        [
            'request_quote' => true,
            'customer_name' => 'Loja mista',
            'customer_phone' => '(11) 98888-7777',
            'items' => [
                ['product_id' => $this->product1->id, 'quantity' => 4],
                ['product_id' => $this->product2->id, 'quantity' => 2],
            ],
        ],
    )->assertRedirect();

    $order = Order::query()->firstOrFail();

    expect($order->order_type)->toBe(OrderType::Quote)
        ->and($order->inventory_reserved_at)->toBeNull()
        ->and($this->product1->fresh()->base_quantity)->toBe(0)
        ->and($this->product2->fresh()->base_quantity)->toBe(5);
});

it('rejects a forged quote request for a cart that is fully available', function () {
    $this->post(
        "/catalog/{$this->catalogSetting->public_token}/orders",
        [
            'request_quote' => true,
            'customer_name' => 'Cliente',
            'customer_email' => 'cliente@example.com',
            'items' => [['product_id' => $this->product1->id, 'quantity' => 1]],
        ],
    )->assertSessionHasErrors('items');

    expect(Order::query()->count())->toBe(0)
        ->and($this->product1->fresh()->base_quantity)->toBe(20);
});

it('returns reserved stock when an order is cancelled', function () {
    $this->post(
        "/catalog/{$this->catalogSetting->public_token}/orders",
        ($this->validCustomerData)([
            'items' => [['product_id' => $this->product1->id, 'quantity' => 4]],
        ]),
    )->assertRedirect();

    $order = Order::firstOrFail();
    expect($this->product1->fresh()->base_quantity)->toBe(16);

    $this->actingAs($this->owner)
        ->post("/manufacturer/orders/{$order->id}/status", ['status' => 'cancelled'])
        ->assertRedirect();

    expect($this->product1->fresh()->base_quantity)->toBe(20)
        ->and($order->fresh()->inventory_released_at)->not->toBeNull();
});

it('restores a recreated variation stock without changing base stock', function () {
    $variationType = VariationType::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'name' => 'Estampa',
    ]);
    ProductVariation::create([
        'product_id' => $this->product1->id,
        'variation_type_id' => $variationType->id,
    ]);
    $this->product1->update(['base_quantity' => 0]);
    $originalStock = ProductVariantStock::factory()->create([
        'product_id' => $this->product1->id,
        'variation_key' => ['Estampa' => 'Bolinhas'],
        'quantity' => 3,
    ]);

    $this->post(
        "/catalog/{$this->catalogSetting->public_token}/orders",
        ($this->validCustomerData)([
            'items' => [[
                'product_id' => $this->product1->id,
                'quantity' => 2,
                'selected_variations' => ['Estampa' => 'Bolinhas'],
            ]],
        ]),
    )->assertRedirect();

    $order = Order::firstOrFail();
    $originalStock->delete();
    $replacementStock = ProductVariantStock::factory()->create([
        'product_id' => $this->product1->id,
        'variation_key' => ['Estampa' => 'Bolinhas'],
        'quantity' => 5,
    ]);

    $this->actingAs($this->owner)
        ->post("/manufacturer/orders/{$order->id}/status", ['status' => 'cancelled'])
        ->assertRedirect();

    expect($replacementStock->fresh()->quantity)->toBe(7)
        ->and($this->product1->fresh()->base_quantity)->toBe(0);
});

it('creates a public order for a juridical person with cnpj', function () {
    $this->post(
        "/catalog/{$this->catalogSetting->public_token}/orders",
        ($this->validCustomerData)([
            'customer_document_type' => 'cnpj',
            'customer_document' => '11.222.333/0001-81',
            'items' => [['product_id' => $this->product1->id, 'quantity' => 1]],
        ]),
    )->assertRedirect();

    $order = Order::first();

    expect($order->customer_document_type)->toBe('cnpj');
    expect($order->customer_document)->toBe('11222333000181');
});

it('generates a unique public token for each order', function () {
    $this->post("/catalog/{$this->catalogSetting->public_token}/orders", ($this->validCustomerData)([
        'customer_name' => 'A',
        'customer_email' => 'a@example.com',
        'items' => [['product_id' => $this->product1->id, 'quantity' => 1]],
    ]));

    $this->post("/catalog/{$this->catalogSetting->public_token}/orders", ($this->validCustomerData)([
        'customer_name' => 'B',
        'customer_email' => 'b@example.com',
        'items' => [['product_id' => $this->product1->id, 'quantity' => 1]],
    ]));

    $tokens = Order::pluck('public_token')->toArray();
    expect($tokens)->toHaveCount(2);
    expect($tokens[0])->not->toBe($tokens[1]);
});

it('rejects an order with products from a different manufacturer', function () {
    $otherManufacturer = Manufacturer::factory()->create(['is_active' => true]);
    $foreignProduct = Product::factory()->create([
        'manufacturer_id' => $otherManufacturer->id,
        'is_active' => true,
    ]);

    $response = $this->post("/catalog/{$this->catalogSetting->public_token}/orders", ($this->validCustomerData)([
        'customer_name' => 'Hacker',
        'items' => [
            ['product_id' => $foreignProduct->id, 'quantity' => 1],
        ],
    ]));

    $response->assertSessionHasErrors('items');
    expect(Order::count())->toBe(0);
});

it('rejects an order without items', function () {
    $response = $this->post("/catalog/{$this->catalogSetting->public_token}/orders", ($this->validCustomerData)([
        'customer_name' => 'Teste',
        'items' => [],
    ]));

    $response->assertSessionHasErrors('items');
});

it('requires at least phone or email', function () {
    $response = $this->post("/catalog/{$this->catalogSetting->public_token}/orders", ($this->validCustomerData)([
        'customer_name' => 'Teste',
        'customer_phone' => null,
        'customer_email' => null,
        'items' => [['product_id' => $this->product1->id, 'quantity' => 1]],
    ]));

    $response->assertSessionHasErrors(['customer_phone', 'customer_email']);
});

it('returns a visible limit error when the manufacturer has no active subscription', function () {
    $this->manufacturer->currentPlan->update([
        'stripe_price_id' => 'price_requires_active_subscription',
    ]);

    $response = $this->post(
        "/catalog/{$this->catalogSetting->public_token}/orders",
        ($this->validCustomerData)([
            'items' => [['product_id' => $this->product1->id, 'quantity' => 1]],
        ]),
    );

    $response->assertSessionHasErrors([
        'limit' => 'Este catálogo não está disponível para novos pedidos no momento. Tente novamente mais tarde.',
    ]);
    expect(Order::count())->toBe(0);
});

it('accepts order with email only (no phone)', function () {
    $response = $this->post("/catalog/{$this->catalogSetting->public_token}/orders", ($this->validCustomerData)([
        'customer_name' => 'Teste',
        'customer_phone' => null,
        'customer_email' => 'teste@example.com',
        'items' => [['product_id' => $this->product1->id, 'quantity' => 1]],
    ]));

    $response->assertRedirect();
    expect(Order::count())->toBe(1);
});

it('requires customer document fields on public orders', function () {
    $response = $this->post("/catalog/{$this->catalogSetting->public_token}/orders", ($this->validCustomerData)([
        'customer_document_type' => null,
        'customer_document' => null,
        'items' => [['product_id' => $this->product1->id, 'quantity' => 1]],
    ]));

    $response->assertSessionHasErrors(['customer_document_type', 'customer_document']);
    expect(Order::count())->toBe(0);
});

it('validates cpf and cnpj according to the selected document type', function (string $type, string $document) {
    $response = $this->post("/catalog/{$this->catalogSetting->public_token}/orders", ($this->validCustomerData)([
        'customer_document_type' => $type,
        'customer_document' => $document,
        'items' => [['product_id' => $this->product1->id, 'quantity' => 1]],
    ]));

    $response->assertSessionHasErrors('customer_document');
    expect(Order::count())->toBe(0);
})->with([
    'invalid cpf' => ['cpf', '111.111.111-11'],
    'invalid cnpj' => ['cnpj', '11.111.111/1111-11'],
]);

it('requires complete address fields on public orders', function () {
    $response = $this->post("/catalog/{$this->catalogSetting->public_token}/orders", ($this->validCustomerData)([
        'customer_zip_code' => null,
        'customer_state' => null,
        'customer_city' => null,
        'customer_neighborhood' => null,
        'customer_street' => null,
        'customer_address_number' => null,
        'items' => [['product_id' => $this->product1->id, 'quantity' => 1]],
    ]));

    $response->assertSessionHasErrors([
        'customer_zip_code',
        'customer_state',
        'customer_city',
        'customer_neighborhood',
        'customer_street',
        'customer_address_number',
    ]);
    expect(Order::count())->toBe(0);
});

it('associates sales rep when ref query param matches an active affiliation', function () {
    $rep = User::factory()->create(['user_type' => UserType::SalesRep]);
    ManufacturerAffiliation::create([
        'manufacturer_id' => $this->manufacturer->id,
        'user_id' => $rep->id,
        'status' => 'active',
    ]);

    $this->post(
        "/catalog/{$this->catalogSetting->public_token}/orders?ref={$rep->id}",
        ($this->validCustomerData)([
            'customer_name' => 'Via Rep',
            'items' => [['product_id' => $this->product1->id, 'quantity' => 1]],
        ]),
    );

    $order = Order::first();
    expect($order->sales_rep_id)->toBe($rep->id);
    expect($order->tracking_ref)->toBe((string) $rep->id);
});

// ──────────────────────────────────────────────
// Public order tracking
// ──────────────────────────────────────────────

it('shows order tracking page for a valid token', function () {
    $order = Order::factory()->forManufacturer($this->manufacturer)->create();
    OrderStatusHistory::create([
        'order_id' => $order->id,
        'from_status' => OrderStatus::New,
        'to_status' => OrderStatus::Confirmed,
        'changed_by_user_id' => $this->owner->id,
    ]);
    OrderItem::factory()->create([
        'order_id' => $order->id,
        'unit_price' => '129.90',
        'quantity' => 3,
    ]);
    OrderItem::factory()->create([
        'order_id' => $order->id,
        'unit_price' => '54.90',
        'quantity' => 2,
    ]);

    $response = $this->get("/o/{$order->public_token}");

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('public/order-tracking')
        ->has('order')
        ->where('order.public_token', $order->public_token)
        ->where('order.total_items', 5)
        ->where('order.total_amount', '499.50')
        ->has('order.status_history', 1)
        ->missing('order.status_history.0.changed_by')
    );
});

it('returns 404 for an invalid tracking token', function () {
    $response = $this->get('/o/invalid-token-that-does-not-exist');

    $response->assertNotFound();
});

// ──────────────────────────────────────────────
// Manufacturer: list & view orders
// ──────────────────────────────────────────────

it('lists orders for the current manufacturer', function () {
    $orders = Order::factory()->forManufacturer($this->manufacturer)->count(3)->create();
    OrderItem::factory()->create([
        'order_id' => $orders->first()->id,
        'unit_price' => '129.90',
        'quantity' => 2,
    ]);
    $quote = Order::factory()->forManufacturer($this->manufacturer)->create([
        'order_type' => OrderType::Quote,
    ]);
    OrderItem::factory()->create([
        'order_id' => $quote->id,
        'unit_price' => '999.90',
        'quantity' => 1,
    ]);

    // Other manufacturer's order should not appear
    $other = Manufacturer::factory()->create(['is_active' => true]);
    $otherOrder = Order::factory()->forManufacturer($other)->create();
    OrderItem::factory()->create([
        'order_id' => $otherOrder->id,
        'unit_price' => '999.90',
        'quantity' => 1,
    ]);

    $response = $this->actingAs($this->owner)->get('/manufacturer/orders');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('manufacturer/orders/index')
        ->has('orders.data', 4)
        ->has('board_stages', 5)
        ->where('board_stages.0.value', OrderStatus::New->value)
        ->has('board_stages.0.orders', 4)
        ->where('order_summary.total_orders', 4)
        ->where('order_summary.in_progress', 4)
        ->where('order_summary.awaiting_confirmation', 4)
        ->where('order_summary.total_amount', '259.80')
        ->where('filters.view', 'board')
    );
});

it('filters orders by status', function () {
    Order::factory()->forManufacturer($this->manufacturer)->status(OrderStatus::New)->count(2)->create();
    Order::factory()->forManufacturer($this->manufacturer)->status(OrderStatus::Confirmed)->create();

    $response = $this->actingAs($this->owner)->get('/manufacturer/orders?status=new');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->has('orders.data', 2)
        ->has('board_stages', 1)
        ->where('board_stages.0.value', OrderStatus::New->value)
    );
});

it('supports the list view without changing the filtered order set', function () {
    Order::factory()->forManufacturer($this->manufacturer)->status(OrderStatus::Delivered)->count(2)->create();
    Order::factory()->forManufacturer($this->manufacturer)->status(OrderStatus::New)->create();

    $response = $this->actingAs($this->owner)->get('/manufacturer/orders?view=list&status=delivered');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->has('orders.data', 2)
        ->where('filters.view', 'list')
        ->where('filters.status', OrderStatus::Delivered->value)
        ->has('board_stages', 1)
        ->where('board_stages.0.value', OrderStatus::Delivered->value)
    );
});

it('searches orders by customer name', function () {
    Order::factory()->forManufacturer($this->manufacturer)->create(['customer_name' => 'Maria Joaquina']);
    Order::factory()->forManufacturer($this->manufacturer)->create(['customer_name' => 'Pedro Silva']);

    $response = $this->actingAs($this->owner)->get('/manufacturer/orders?search=Maria');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->has('orders.data', 1)
    );
});

it('shows a specific order belonging to the manufacturer', function () {
    config(['filesystems.disks.s3.url' => 'https://cdn.zouth.app']);

    $order = Order::factory()->forManufacturer($this->manufacturer)->create();
    OrderStatusHistory::create([
        'order_id' => $order->id,
        'from_status' => OrderStatus::New,
        'to_status' => OrderStatus::Confirmed,
        'changed_by_user_id' => $this->owner->id,
    ]);
    ProductMedia::factory()->create([
        'product_id' => $this->product1->id,
        'path' => 'products/order-product.jpg',
        'thumbnail_path' => 'products/thumbnails/order-product.jpg',
    ]);
    OrderItem::factory()->create([
        'order_id' => $order->id,
        'product_id' => $this->product1->id,
        'unit_price' => '129.90',
        'quantity' => 3,
    ]);
    OrderItem::factory()->create([
        'order_id' => $order->id,
        'unit_price' => '54.90',
        'quantity' => 2,
    ]);

    $response = $this->actingAs($this->owner)->get("/manufacturer/orders/{$order->id}");

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('manufacturer/orders/show')
        ->has('order')
        ->where('order.id', $order->id)
        ->where('order.total_items', 5)
        ->where('order.total_amount', '499.50')
        ->where('order.items.0.image_urls.0', 'https://cdn.zouth.app/products/thumbnails/order-product.jpg')
        ->where('order.status_history.0.changed_by', $this->owner->name)
    );
});

it('forbids viewing an order from another manufacturer', function () {
    $other = Manufacturer::factory()->create(['is_active' => true]);
    $order = Order::factory()->forManufacturer($other)->create();

    $response = $this->actingAs($this->owner)->get("/manufacturer/orders/{$order->id}");

    $response->assertForbidden();
});

// ──────────────────────────────────────────────
// Manufacturer: status transitions
// ──────────────────────────────────────────────

it('transitions order through the valid status flow', function () {
    $order = Order::factory()->forManufacturer($this->manufacturer)->status(OrderStatus::New)->create();

    // New → Confirmed
    $this->actingAs($this->owner)
        ->post("/manufacturer/orders/{$order->id}/status", ['status' => 'confirmed'])
        ->assertRedirect();

    $order->refresh();
    expect($order->status)->toBe(OrderStatus::Confirmed);

    // Confirmed → Preparing
    $this->actingAs($this->owner)
        ->post("/manufacturer/orders/{$order->id}/status", ['status' => 'preparing'])
        ->assertRedirect();

    $order->refresh();
    expect($order->status)->toBe(OrderStatus::Preparing);

    // Preparing → Shipped
    $this->actingAs($this->owner)
        ->post("/manufacturer/orders/{$order->id}/status", ['status' => 'shipped'])
        ->assertRedirect();

    $order->refresh();
    expect($order->status)->toBe(OrderStatus::Shipped);

    // Shipped → Delivered
    $this->actingAs($this->owner)
        ->post("/manufacturer/orders/{$order->id}/status", ['status' => 'delivered'])
        ->assertRedirect();

    $order->refresh();
    expect($order->status)->toBe(OrderStatus::Delivered);
});

it('records status history for each transition', function () {
    $order = Order::factory()->forManufacturer($this->manufacturer)->status(OrderStatus::New)->create();

    $this->actingAs($this->owner)
        ->post("/manufacturer/orders/{$order->id}/status", ['status' => 'confirmed']);

    $history = OrderStatusHistory::where('order_id', $order->id)->get();

    expect($history)->toHaveCount(1);
    expect($history->first()->from_status)->toBe(OrderStatus::New);
    expect($history->first()->to_status)->toBe(OrderStatus::Confirmed);
    expect($history->first()->changed_by_user_id)->toBe($this->owner->id);
});

it('allows moving directly to any operational status', function () {
    $order = Order::factory()->forManufacturer($this->manufacturer)->status(OrderStatus::New)->create();

    $this->actingAs($this->owner)
        ->post("/manufacturer/orders/{$order->id}/status", ['status' => 'shipped'])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $order->refresh();
    expect($order->status)->toBe(OrderStatus::Shipped);
});

it('allows moving an order backwards after an accidental advance', function () {
    $order = Order::factory()->forManufacturer($this->manufacturer)->status(OrderStatus::Delivered)->create();

    $this->actingAs($this->owner)
        ->post("/manufacturer/orders/{$order->id}/status", ['status' => 'preparing'])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    expect($order->refresh()->status)->toBe(OrderStatus::Preparing);
    expect(OrderStatusHistory::query()
        ->where('order_id', $order->id)
        ->where('from_status', OrderStatus::Delivered->value)
        ->where('to_status', OrderStatus::Preparing->value)
        ->exists())->toBeTrue();
});

it('keeps cancelled orders terminal because their stock was released', function () {
    $order = Order::factory()->forManufacturer($this->manufacturer)->status(OrderStatus::Cancelled)->create();

    $this->actingAs($this->owner)
        ->post("/manufacturer/orders/{$order->id}/status", ['status' => 'new'])
        ->assertSessionHasErrors('status');

    expect($order->refresh()->status)->toBe(OrderStatus::Cancelled);
});

it('can cancel an order from any non-terminal state', function (OrderStatus $status) {
    $order = Order::factory()->forManufacturer($this->manufacturer)->status($status)->create();

    $this->actingAs($this->owner)
        ->post("/manufacturer/orders/{$order->id}/status", ['status' => 'cancelled'])
        ->assertRedirect();

    $order->refresh();
    expect($order->status)->toBe(OrderStatus::Cancelled);
})->with([
    'new' => OrderStatus::New,
    'confirmed' => OrderStatus::Confirmed,
    'preparing' => OrderStatus::Preparing,
    'shipped' => OrderStatus::Shipped,
]);

it('forbids status update on another manufacturer order', function () {
    $other = Manufacturer::factory()->create(['is_active' => true]);
    $order = Order::factory()->forManufacturer($other)->create();

    $response = $this->actingAs($this->owner)
        ->post("/manufacturer/orders/{$order->id}/status", ['status' => 'confirmed']);

    $response->assertForbidden();
});

// ──────────────────────────────────────────────
// Manufacturer: internal notes
// ──────────────────────────────────────────────

it('updates internal notes on an order', function () {
    $order = Order::factory()->forManufacturer($this->manufacturer)->create();

    $this->actingAs($this->owner)
        ->put("/manufacturer/orders/{$order->id}/notes", ['internal_notes' => 'Preparar para envio até sexta.'])
        ->assertRedirect();

    $order->refresh();
    expect($order->internal_notes)->toBe('Preparar para envio até sexta.');
});

// ──────────────────────────────────────────────
// Sales rep: view own orders
// ──────────────────────────────────────────────

it('shows only orders assigned to the sales rep', function () {
    $rep = User::factory()->create(['user_type' => UserType::SalesRep]);
    ManufacturerAffiliation::create([
        'manufacturer_id' => $this->manufacturer->id,
        'user_id' => $rep->id,
        'status' => 'active',
    ]);

    // Orders assigned to this rep
    Order::factory()->forManufacturer($this->manufacturer)->count(2)->create(['sales_rep_id' => $rep->id]);

    // Order assigned to a different rep
    $otherRep = User::factory()->create(['user_type' => UserType::SalesRep]);
    Order::factory()->forManufacturer($this->manufacturer)->create(['sales_rep_id' => $otherRep->id]);

    // Unassigned order
    Order::factory()->forManufacturer($this->manufacturer)->create(['sales_rep_id' => null]);

    $response = $this->actingAs($rep)->get('/rep/orders');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('rep/orders/index')
        ->has('orders.data', 2)
    );
});
