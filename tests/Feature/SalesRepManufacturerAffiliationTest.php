<?php

use App\Enums\UserType;
use App\Models\Manufacturer;
use App\Models\ManufacturerAffiliation;
use App\Models\User;

beforeEach(function () {
    $this->salesRep = User::factory()->create([
        'user_type' => UserType::SalesRep,
    ]);

    $this->manufacturer = Manufacturer::factory()->create([
        'name' => 'Acme Corporation',
        'slug' => 'acme',
    ]);
});

it('lists all manufacturers for sales rep with affiliation status', function () {
    $response = $this->actingAs($this->salesRep)->get('/rep/manufacturers');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('rep/manufacturers/index')
        ->has('manufacturers.data', 1)
        ->has('manufacturers.data.0', fn ($manufacturer) => $manufacturer
            ->where('id', $this->manufacturer->id)
            ->where('name', 'Acme Corporation')
            ->where('slug', 'acme')
            ->where('affiliation_status', 'none')
            ->etc()
        )
    );
});

it('shows pending status for manufacturers with pending affiliation', function () {
    ManufacturerAffiliation::create([
        'manufacturer_id' => $this->manufacturer->id,
        'user_id' => $this->salesRep->id,
        'status' => 'pending',
    ]);

    $response = $this->actingAs($this->salesRep)->get('/rep/manufacturers');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->has('manufacturers.data.0', fn ($manufacturer) => $manufacturer
            ->where('affiliation_status', 'pending')
            ->etc()
        )
    );
});

it('shows active status for manufacturers with active affiliation', function () {
    ManufacturerAffiliation::create([
        'manufacturer_id' => $this->manufacturer->id,
        'user_id' => $this->salesRep->id,
        'status' => 'active',
    ]);

    $response = $this->actingAs($this->salesRep)->get('/rep/manufacturers');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->has('manufacturers.data.0', fn ($manufacturer) => $manufacturer
            ->where('affiliation_status', 'active')
            ->etc()
        )
    );
});

it('allows sales rep to create affiliation request', function () {
    $response = $this->actingAs($this->salesRep)
        ->from('/rep/manufacturers')
        ->post("/rep/manufacturers/{$this->manufacturer->id}/affiliate");

    $response->assertRedirect('/rep/manufacturers');

    $this->assertDatabaseHas('manufacturer_affiliations', [
        'manufacturer_id' => $this->manufacturer->id,
        'user_id' => $this->salesRep->id,
        'status' => 'pending',
    ]);
});

it('prevents duplicate pending affiliation requests', function () {
    ManufacturerAffiliation::create([
        'manufacturer_id' => $this->manufacturer->id,
        'user_id' => $this->salesRep->id,
        'status' => 'pending',
    ]);

    $response = $this->actingAs($this->salesRep)
        ->from('/rep/manufacturers')
        ->post("/rep/manufacturers/{$this->manufacturer->id}/affiliate");

    $response->assertRedirect('/rep/manufacturers');

    // Should still have only one record
    expect(ManufacturerAffiliation::count())->toBe(1);
});

it('allows re-requesting affiliation after rejection', function () {
    $affiliation = ManufacturerAffiliation::create([
        'manufacturer_id' => $this->manufacturer->id,
        'user_id' => $this->salesRep->id,
        'status' => 'rejected',
    ]);

    $response = $this->actingAs($this->salesRep)
        ->from('/rep/manufacturers')
        ->post("/rep/manufacturers/{$this->manufacturer->id}/affiliate");

    $response->assertRedirect('/rep/manufacturers');

    $affiliation->refresh();
    expect($affiliation->status)->toBe('pending');
});

it('allows re-requesting affiliation after revocation', function () {
    $affiliation = ManufacturerAffiliation::create([
        'manufacturer_id' => $this->manufacturer->id,
        'user_id' => $this->salesRep->id,
        'status' => 'revoked',
    ]);

    $response = $this->actingAs($this->salesRep)
        ->from('/rep/manufacturers')
        ->post("/rep/manufacturers/{$this->manufacturer->id}/affiliate");

    $response->assertRedirect('/rep/manufacturers');

    $affiliation->refresh();
    expect($affiliation->status)->toBe('pending');
});

it('filters manufacturers by search term', function () {
    Manufacturer::factory()->create([
        'name' => 'Widgets Inc',
        'slug' => 'widgets',
    ]);

    $response = $this->actingAs($this->salesRep)
        ->get('/rep/manufacturers?search=acme');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->has('manufacturers.data', 1)
        ->has('manufacturers.data.0', fn ($manufacturer) => $manufacturer
            ->where('name', 'Acme Corporation')
            ->etc()
        )
    );
});

it('filters manufacturers by affiliation status', function () {
    $manufacturerWithPending = Manufacturer::factory()->create();
    ManufacturerAffiliation::create([
        'manufacturer_id' => $manufacturerWithPending->id,
        'user_id' => $this->salesRep->id,
        'status' => 'pending',
    ]);

    $response = $this->actingAs($this->salesRep)
        ->get('/rep/manufacturers?status=pending');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->has('manufacturers.data', 1)
        ->has('manufacturers.data.0', fn ($manufacturer) => $manufacturer
            ->where('id', $manufacturerWithPending->id)
            ->where('affiliation_status', 'pending')
            ->etc()
        )
    );
});

it('allows access to catalog for active affiliations', function () {
    ManufacturerAffiliation::create([
        'manufacturer_id' => $this->manufacturer->id,
        'user_id' => $this->salesRep->id,
        'status' => 'active',
    ]);

    $response = $this->actingAs($this->salesRep)
        ->get("/rep/m/{$this->manufacturer->slug}/catalog");

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('rep/manufacturers/catalog')
        ->has('manufacturer', fn ($manufacturer) => $manufacturer
            ->where('id', $this->manufacturer->id)
            ->where('name', 'Acme Corporation')
            ->where('slug', 'acme')
            ->etc()
        )
    );
});

it('denies access to catalog without active affiliation', function () {
    $response = $this->actingAs($this->salesRep)
        ->get("/rep/m/{$this->manufacturer->slug}/catalog");

    $response->assertForbidden();
});

it('denies access to catalog with pending affiliation', function () {
    ManufacturerAffiliation::create([
        'manufacturer_id' => $this->manufacturer->id,
        'user_id' => $this->salesRep->id,
        'status' => 'pending',
    ]);

    $response = $this->actingAs($this->salesRep)
        ->get("/rep/m/{$this->manufacturer->slug}/catalog");

    $response->assertForbidden();
});

it('denies access for non-sales-rep users', function () {
    $manufacturerUser = User::factory()->create([
        'user_type' => UserType::ManufacturerUser,
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);

    $response = $this->actingAs($manufacturerUser)
        ->get('/rep/manufacturers');

    $response->assertForbidden();
});
