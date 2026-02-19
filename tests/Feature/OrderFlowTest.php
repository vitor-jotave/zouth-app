<?php

use App\Enums\OrderStatus;
use App\Enums\UserType;
use App\Models\CatalogSetting;
use App\Models\Manufacturer;
use App\Models\ManufacturerAffiliation;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderStatusHistory;
use App\Models\Plan;
use App\Models\Product;
use App\Models\User;

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
});

// ──────────────────────────────────────────────
// Public order creation
// ──────────────────────────────────────────────

it('creates an order via the public catalog endpoint', function () {
    $response = $this->post(
        "/catalog/{$this->catalogSetting->public_token}/orders",
        [
            'customer_name' => 'Cliente Teste',
            'customer_phone' => '(11) 99999-9999',
            'items' => [
                ['product_id' => $this->product1->id, 'quantity' => 2],
                ['product_id' => $this->product2->id, 'quantity' => 1, 'size' => 'M', 'color' => 'Azul'],
            ],
        ],
    );

    $order = Order::first();

    expect($order)->not->toBeNull();
    expect($order->manufacturer_id)->toBe($this->manufacturer->id);
    expect($order->status)->toBe(OrderStatus::New);
    expect($order->customer_name)->toBe('Cliente Teste');
    expect($order->customer_phone)->toBe('(11) 99999-9999');
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

    $response->assertRedirect(route('public.order.show', $order->public_token));
});

it('generates a unique public token for each order', function () {
    $this->post("/catalog/{$this->catalogSetting->public_token}/orders", [
        'customer_name' => 'A',
        'customer_email' => 'a@example.com',
        'items' => [['product_id' => $this->product1->id, 'quantity' => 1]],
    ]);

    $this->post("/catalog/{$this->catalogSetting->public_token}/orders", [
        'customer_name' => 'B',
        'customer_email' => 'b@example.com',
        'items' => [['product_id' => $this->product1->id, 'quantity' => 1]],
    ]);

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

    $response = $this->post("/catalog/{$this->catalogSetting->public_token}/orders", [
        'customer_name' => 'Hacker',
        'customer_phone' => '(11) 99999-9999',
        'items' => [
            ['product_id' => $foreignProduct->id, 'quantity' => 1],
        ],
    ]);

    $response->assertSessionHasErrors('items');
    expect(Order::count())->toBe(0);
});

it('rejects an order without items', function () {
    $response = $this->post("/catalog/{$this->catalogSetting->public_token}/orders", [
        'customer_name' => 'Teste',
        'customer_phone' => '(11) 99999-9999',
        'items' => [],
    ]);

    $response->assertSessionHasErrors('items');
});

it('requires at least phone or email', function () {
    $response = $this->post("/catalog/{$this->catalogSetting->public_token}/orders", [
        'customer_name' => 'Teste',
        'items' => [['product_id' => $this->product1->id, 'quantity' => 1]],
    ]);

    $response->assertSessionHasErrors(['customer_phone', 'customer_email']);
});

it('accepts order with email only (no phone)', function () {
    $response = $this->post("/catalog/{$this->catalogSetting->public_token}/orders", [
        'customer_name' => 'Teste',
        'customer_email' => 'teste@example.com',
        'items' => [['product_id' => $this->product1->id, 'quantity' => 1]],
    ]);

    $response->assertRedirect();
    expect(Order::count())->toBe(1);
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
        [
            'customer_name' => 'Via Rep',
            'customer_phone' => '(11) 99999-9999',
            'items' => [['product_id' => $this->product1->id, 'quantity' => 1]],
        ],
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

    $response = $this->get("/o/{$order->public_token}");

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('public/order-tracking')
        ->has('order')
        ->where('order.public_token', $order->public_token)
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
    Order::factory()->forManufacturer($this->manufacturer)->count(3)->create();

    // Other manufacturer's order should not appear
    $other = Manufacturer::factory()->create(['is_active' => true]);
    Order::factory()->forManufacturer($other)->create();

    $response = $this->actingAs($this->owner)->get('/manufacturer/orders');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('manufacturer/orders/index')
        ->has('orders.data', 3)
    );
});

it('filters orders by status', function () {
    Order::factory()->forManufacturer($this->manufacturer)->status(OrderStatus::New)->count(2)->create();
    Order::factory()->forManufacturer($this->manufacturer)->status(OrderStatus::Confirmed)->create();

    $response = $this->actingAs($this->owner)->get('/manufacturer/orders?status=new');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->has('orders.data', 2)
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
    $order = Order::factory()->forManufacturer($this->manufacturer)->create();
    OrderItem::factory()->create(['order_id' => $order->id]);

    $response = $this->actingAs($this->owner)->get("/manufacturer/orders/{$order->id}");

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('manufacturer/orders/show')
        ->has('order')
        ->where('order.id', $order->id)
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

it('rejects invalid status transitions', function () {
    $order = Order::factory()->forManufacturer($this->manufacturer)->status(OrderStatus::New)->create();

    // New → Shipped is not allowed (must go through Confirmed → Preparing first)
    $response = $this->actingAs($this->owner)
        ->post("/manufacturer/orders/{$order->id}/status", ['status' => 'shipped']);

    $response->assertSessionHasErrors('status');

    $order->refresh();
    expect($order->status)->toBe(OrderStatus::New);
});

it('rejects transitions from terminal states', function () {
    $order = Order::factory()->forManufacturer($this->manufacturer)->status(OrderStatus::Delivered)->create();

    $response = $this->actingAs($this->owner)
        ->post("/manufacturer/orders/{$order->id}/status", ['status' => 'new']);

    $response->assertSessionHasErrors('status');
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
