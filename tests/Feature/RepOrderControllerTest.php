<?php

use App\Enums\UserType;
use App\Models\Manufacturer;
use App\Models\Order;
use App\Models\User;

beforeEach(function () {
    $this->withoutVite();

    $this->rep = User::factory()->create([
        'user_type' => UserType::SalesRep,
    ]);

    $this->manufacturer = Manufacturer::factory()->create(['is_active' => true]);
});

// ──────────────────────────────────────────────
// Index
// ──────────────────────────────────────────────

it('shows the rep orders index', function () {
    Order::factory()->count(3)->create([
        'manufacturer_id' => $this->manufacturer->id,
        'sales_rep_id' => $this->rep->id,
    ]);

    $this->actingAs($this->rep)
        ->get(route('rep.orders.index'))
        ->assertOk();
});

it('groups only attributed orders by stage and keeps counts when a column is capped', function () {
    Order::factory()->count(10)->create([
        'manufacturer_id' => $this->manufacturer->id,
        'sales_rep_id' => $this->rep->id,
        'status' => 'new',
        'customer_name' => 'Loja Horizonte',
        'total_cents' => 10000,
    ]);
    $delivered = Order::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'sales_rep_id' => $this->rep->id,
        'status' => 'delivered',
        'customer_name' => 'Loja Horizonte',
        'total_cents' => 5000,
    ]);
    Order::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'customer_name' => 'Loja Horizonte',
    ]);

    $this->actingAs($this->rep)->get(route('rep.orders.index', ['search' => 'Horizonte']))
        ->assertInertia(fn ($page) => $page
            ->where('filters.view', 'board')
            ->where('summary.total', 11)
            ->where('summary.net_amount', 1050)
            ->where('stages.0.count', 10)
            ->has('stages.0.orders', 8)
            ->where('stages.4.orders.0.id', $delivered->id));

    $this->get(route('rep.orders.index', ['view' => 'list', 'status' => 'delivered', 'search' => 'Horizonte']))
        ->assertInertia(fn ($page) => $page
            ->where('filters.view', 'list')
            ->has('stages', 0)
            ->has('orders.data', 1)
            ->where('orders.data.0.id', $delivered->id));
});

it('only shows orders belonging to the logged-in rep', function () {
    $myOrder = Order::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'sales_rep_id' => $this->rep->id,
        'customer_name' => 'Meu Cliente',
    ]);

    $otherRep = User::factory()->create(['user_type' => UserType::SalesRep]);
    Order::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'sales_rep_id' => $otherRep->id,
        'customer_name' => 'Outro Cliente',
    ]);

    $response = $this->actingAs($this->rep)
        ->get(route('rep.orders.index'));

    $response->assertOk();

    $orders = $response->original->getData()['page']['props']['orders']['data'];
    expect($orders)->toHaveCount(1);
    expect($orders[0]['customer_name'])->toBe('Meu Cliente');
});

it('denies guests from rep orders', function () {
    $this->get(route('rep.orders.index'))
        ->assertRedirect(route('login'));
});

it('denies manufacturer users from rep orders', function () {
    $mfgUser = User::factory()->create([
        'user_type' => UserType::ManufacturerUser,
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);
    $this->manufacturer->users()->attach($mfgUser->id, ['role' => 'owner', 'status' => 'active']);

    $this->actingAs($mfgUser)
        ->get(route('rep.orders.index'))
        ->assertForbidden();
});

it('paginates rep orders', function () {
    Order::factory()->count(20)->create([
        'manufacturer_id' => $this->manufacturer->id,
        'sales_rep_id' => $this->rep->id,
    ]);

    $response = $this->actingAs($this->rep)
        ->get(route('rep.orders.index'));

    $response->assertOk();

    $orders = $response->original->getData()['page']['props']['orders']['data'];
    expect($orders)->toHaveCount(15);
});

it('filters the commercial list and only exposes details of attributed orders', function () {
    $matching = Order::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'sales_rep_id' => $this->rep->id,
        'status' => 'confirmed',
        'subtotal_cents' => 10000,
        'discount_cents' => 500,
        'total_cents' => 9500,
        'customer_document' => 'private document',
    ]);
    Order::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'sales_rep_id' => $this->rep->id,
        'status' => 'confirmed',
        'created_at' => now()->subDays(31),
    ]);
    $unassigned = Order::factory()->create(['manufacturer_id' => $this->manufacturer->id]);
    $matching->statusHistory()->create([
        'from_status' => 'new',
        'to_status' => 'confirmed',
        'changed_by_user_id' => $this->rep->id,
    ]);

    $this->actingAs($this->rep)
        ->get(route('rep.orders.index', ['brand' => $this->manufacturer->id, 'status' => 'confirmed', 'days' => 30]))
        ->assertInertia(fn ($page) => $page->has('orders.data', 1)->where('orders.data.0.id', $matching->id));

    $this->get(route('rep.orders.show', $matching))
        ->assertInertia(fn ($page) => $page->component('rep/orders/show')
            ->where('order.total_amount', 95)
            ->where('order.status_history.0.to_status', 'confirmed')
            ->missing('order.status_history.0.changed_by')
            ->missing('order.customer_document')
            ->missing('order.internal_notes'));
    $this->get(route('rep.orders.show', $unassigned))->assertNotFound();
});
