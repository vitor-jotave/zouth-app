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
