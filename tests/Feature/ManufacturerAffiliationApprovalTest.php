<?php

use App\Enums\UserType;
use App\Models\Manufacturer;
use App\Models\ManufacturerAffiliation;
use App\Models\Order;
use App\Models\Plan;
use App\Models\User;

beforeEach(function () {
    $plan = Plan::factory()->premium()->create();
    $this->manufacturer = Manufacturer::factory()->create([
        'name' => 'Test Manufacturer',
        'slug' => 'test-manufacturer',
        'current_plan_id' => $plan->id,
    ]);

    $this->manufacturerOwner = User::factory()->create([
        'user_type' => UserType::ManufacturerUser,
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);

    // Attach user to manufacturer with owner role
    $this->manufacturer->users()->attach($this->manufacturerOwner->id, [
        'role' => 'owner',
        'status' => 'active',
    ]);

    $this->salesRep = User::factory()->create([
        'user_type' => UserType::SalesRep,
    ]);
});

it('lists all affiliations for manufacturer owner', function () {
    $affiliation = ManufacturerAffiliation::create([
        'manufacturer_id' => $this->manufacturer->id,
        'user_id' => $this->salesRep->id,
        'status' => 'pending',
    ]);

    $response = $this->actingAs($this->manufacturerOwner)->get('/manufacturer/representatives');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('manufacturer/representatives/index')
        ->has('affiliations', 1)
        ->has('affiliations.0', fn ($aff) => $aff
            ->where('id', $affiliation->id)
            ->where('status', 'pending')
            ->has('user', fn ($user) => $user
                ->where('id', $this->salesRep->id)
                ->where('name', $this->salesRep->name)
                ->where('email', $this->salesRep->email)
                ->etc()
            )
            ->etc()
        )
    );
});

it('shows the recent sales history for each representative without crossing manufacturers', function () {
    ManufacturerAffiliation::factory()->active()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'user_id' => $this->salesRep->id,
    ]);

    $orders = collect(range(1, 6))->map(fn (int $daysAgo): Order => Order::factory()
        ->forManufacturer($this->manufacturer)
        ->create([
            'sales_rep_id' => $this->salesRep->id,
            'total_cents' => $daysAgo * 10000,
            'customer_name' => "Lojista {$daysAgo}",
            'created_at' => now()->subDays($daysAgo),
        ]));

    $otherManufacturer = Manufacturer::factory()->create();
    Order::factory()
        ->forManufacturer($otherManufacturer)
        ->create([
            'sales_rep_id' => $this->salesRep->id,
            'customer_name' => 'Lojista de outra fabricante',
            'created_at' => now(),
        ]);

    $response = $this->actingAs($this->manufacturerOwner)
        ->get('/manufacturer/representatives?segment=active');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->where('affiliations.0.performance.orders_count', 6)
        ->has('affiliations.0.sales_history.orders', 5)
        ->where('affiliations.0.sales_history.orders.0.id', $orders->first()->id)
        ->where('affiliations.0.sales_history.orders.0.customer_name', 'Lojista 1')
        ->where('affiliations.0.sales_history.has_more', true)
    );
});

it('opens the complete order history filtered by representative', function () {
    ManufacturerAffiliation::factory()->active()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'user_id' => $this->salesRep->id,
    ]);
    $otherSalesRep = User::factory()->create([
        'user_type' => UserType::SalesRep,
    ]);
    ManufacturerAffiliation::factory()->active()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'user_id' => $otherSalesRep->id,
    ]);

    Order::factory()
        ->forManufacturer($this->manufacturer)
        ->count(2)
        ->create(['sales_rep_id' => $this->salesRep->id]);
    Order::factory()
        ->forManufacturer($this->manufacturer)
        ->create(['sales_rep_id' => $otherSalesRep->id]);

    $response = $this->actingAs($this->manufacturerOwner)
        ->get("/manufacturer/orders?view=list&sales_rep={$this->salesRep->id}");

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('manufacturer/orders/index')
        ->has('orders.data', 2)
        ->where('orders.data.0.sales_rep.id', $this->salesRep->id)
        ->where('orders.data.1.sales_rep.id', $this->salesRep->id)
        ->where('filters.sales_rep', $this->salesRep->id)
        ->where('filters.sales_rep_name', $this->salesRep->name)
        ->where('order_summary.total_orders', 2)
    );
});

it('filters affiliations by status', function () {
    ManufacturerAffiliation::create([
        'manufacturer_id' => $this->manufacturer->id,
        'user_id' => $this->salesRep->id,
        'status' => 'pending',
    ]);

    $activeSalesRep = User::factory()->create([
        'user_type' => UserType::SalesRep,
    ]);

    ManufacturerAffiliation::create([
        'manufacturer_id' => $this->manufacturer->id,
        'user_id' => $activeSalesRep->id,
        'status' => 'active',
    ]);

    $response = $this->actingAs($this->manufacturerOwner)
        ->get('/manufacturer/representatives?segment=requests');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->has('affiliations', 2)
        ->where('filters.segment', 'requests')
    );
});

it('redirects the legacy affiliations page to representatives', function () {
    $this->actingAs($this->manufacturerOwner)
        ->get('/affiliations')
        ->assertRedirect('/manufacturer/representatives');
});

it('allows manufacturer owner to approve pending affiliation', function () {
    $affiliation = ManufacturerAffiliation::create([
        'manufacturer_id' => $this->manufacturer->id,
        'user_id' => $this->salesRep->id,
        'status' => 'pending',
    ]);

    $response = $this->actingAs($this->manufacturerOwner)
        ->from('/affiliations')
        ->post("/affiliations/{$affiliation->id}/approve");

    $response->assertRedirect('/affiliations');

    $affiliation->refresh();
    expect($affiliation->status)->toBe('active');
});

it('prevents approving non-pending affiliations', function () {
    $affiliation = ManufacturerAffiliation::create([
        'manufacturer_id' => $this->manufacturer->id,
        'user_id' => $this->salesRep->id,
        'status' => 'active',
    ]);

    $response = $this->actingAs($this->manufacturerOwner)
        ->from('/affiliations')
        ->post("/affiliations/{$affiliation->id}/approve");

    $response->assertRedirect('/affiliations');
    $response->assertSessionHas('error');

    $affiliation->refresh();
    expect($affiliation->status)->toBe('active'); // Still active
});

it('allows manufacturer owner to reject pending affiliation', function () {
    $affiliation = ManufacturerAffiliation::create([
        'manufacturer_id' => $this->manufacturer->id,
        'user_id' => $this->salesRep->id,
        'status' => 'pending',
    ]);

    $response = $this->actingAs($this->manufacturerOwner)
        ->from('/affiliations')
        ->post("/affiliations/{$affiliation->id}/reject");

    $response->assertRedirect('/affiliations');

    $affiliation->refresh();
    expect($affiliation->status)->toBe('rejected');
});

it('prevents rejecting non-pending affiliations', function () {
    $affiliation = ManufacturerAffiliation::create([
        'manufacturer_id' => $this->manufacturer->id,
        'user_id' => $this->salesRep->id,
        'status' => 'active',
    ]);

    $response = $this->actingAs($this->manufacturerOwner)
        ->from('/affiliations')
        ->post("/affiliations/{$affiliation->id}/reject");

    $response->assertRedirect('/affiliations');
    $response->assertSessionHas('error');

    $affiliation->refresh();
    expect($affiliation->status)->toBe('active'); // Still active
});

it('allows manufacturer owner to revoke active affiliation', function () {
    $affiliation = ManufacturerAffiliation::create([
        'manufacturer_id' => $this->manufacturer->id,
        'user_id' => $this->salesRep->id,
        'status' => 'active',
    ]);

    $response = $this->actingAs($this->manufacturerOwner)
        ->from('/affiliations')
        ->post("/affiliations/{$affiliation->id}/revoke");

    $response->assertRedirect('/affiliations');

    $affiliation->refresh();
    expect($affiliation->status)->toBe('revoked');
});

it('prevents revoking non-active affiliations', function () {
    $affiliation = ManufacturerAffiliation::create([
        'manufacturer_id' => $this->manufacturer->id,
        'user_id' => $this->salesRep->id,
        'status' => 'pending',
    ]);

    $response = $this->actingAs($this->manufacturerOwner)
        ->from('/affiliations')
        ->post("/affiliations/{$affiliation->id}/revoke");

    $response->assertRedirect('/affiliations');
    $response->assertSessionHas('error');

    $affiliation->refresh();
    expect($affiliation->status)->toBe('pending'); // Still pending
});

it('prevents manufacturer owner from managing affiliations from other manufacturers', function () {
    $otherManufacturer = Manufacturer::factory()->create();
    $affiliation = ManufacturerAffiliation::create([
        'manufacturer_id' => $otherManufacturer->id,
        'user_id' => $this->salesRep->id,
        'status' => 'pending',
    ]);

    $response = $this->actingAs($this->manufacturerOwner)
        ->from('/affiliations')
        ->post("/affiliations/{$affiliation->id}/approve");

    $response->assertForbidden();

    $affiliation->refresh();
    expect($affiliation->status)->toBe('pending'); // Unchanged
});

it('prevents sales rep from accessing affiliation management', function () {
    $response = $this->actingAs($this->salesRep)
        ->get('/affiliations');

    $response->assertForbidden();
});

it('prevents superadmin without manufacturer from accessing affiliation management', function () {
    $superadmin = User::factory()->create([
        'user_type' => UserType::Superadmin,
    ]);

    $response = $this->actingAs($superadmin)
        ->get('/affiliations');

    $response->assertForbidden();
});
