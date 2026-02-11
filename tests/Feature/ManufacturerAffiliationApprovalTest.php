<?php

use App\Enums\UserType;
use App\Models\Manufacturer;
use App\Models\ManufacturerAffiliation;
use App\Models\User;

beforeEach(function () {
    $this->manufacturer = Manufacturer::factory()->create([
        'name' => 'Test Manufacturer',
        'slug' => 'test-manufacturer',
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

    $response = $this->actingAs($this->manufacturerOwner)->get('/affiliations');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('affiliations/index')
        ->has('affiliations.data', 1)
        ->has('affiliations.data.0', fn ($aff) => $aff
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
        ->get('/affiliations?status=pending');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->has('affiliations.data', 1)
        ->has('affiliations.data.0', fn ($aff) => $aff
            ->where('status', 'pending')
            ->etc()
        )
    );
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
