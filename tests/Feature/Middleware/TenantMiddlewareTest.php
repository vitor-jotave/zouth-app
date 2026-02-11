<?php

use App\Models\Manufacturer;
use App\Models\User;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\assertGuest;

beforeEach(function () {
    $this->withoutVite();
    $this->manufacturer = Manufacturer::factory()->create(['is_active' => true]);
});

it('allows manufacturer user with active membership to access dashboard', function () {
    $user = User::factory()->create([
        'user_type' => 'manufacturer_user',
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);

    $this->manufacturer->users()->attach($user->id, [
        'role' => 'owner',
        'status' => 'active',
    ]);

    actingAs($user);

    $response = $this->get('/dashboard');

    $response->assertSuccessful();
});

it('blocks manufacturer user with inactive manufacturer', function () {
    $inactiveManufacturer = Manufacturer::factory()->create(['is_active' => false]);

    $user = User::factory()->create([
        'user_type' => 'manufacturer_user',
        'current_manufacturer_id' => $inactiveManufacturer->id,
    ]);

    $inactiveManufacturer->users()->attach($user->id, [
        'role' => 'owner',
        'status' => 'active',
    ]);

    actingAs($user);

    $response = $this->get('/dashboard');

    $response->assertForbidden();
    assertGuest();
});

it('blocks manufacturer user without current_manufacturer_id', function () {
    $user = User::factory()->create([
        'user_type' => 'manufacturer_user',
        'current_manufacturer_id' => null,
    ]);

    actingAs($user);

    $response = $this->get('/dashboard');

    $response->assertForbidden();
    assertGuest();
});

it('blocks manufacturer user with blocked membership', function () {
    $user = User::factory()->create([
        'user_type' => 'manufacturer_user',
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);

    $this->manufacturer->users()->attach($user->id, [
        'role' => 'staff',
        'status' => 'blocked',
    ]);

    actingAs($user);

    $response = $this->get('/dashboard');

    $response->assertForbidden();
    assertGuest();
});

it('blocks superadmin from accessing manufacturer dashboard', function () {
    $superadmin = User::factory()->create(['user_type' => 'superadmin']);

    actingAs($superadmin);

    $response = $this->get('/dashboard');

    $response->assertForbidden();
});

it('blocks sales rep from accessing manufacturer dashboard', function () {
    $salesRep = User::factory()->create(['user_type' => 'sales_rep']);

    actingAs($salesRep);

    $response = $this->get('/dashboard');

    $response->assertForbidden();
});

it('allows superadmin to access admin dashboard', function () {
    $superadmin = User::factory()->create(['user_type' => 'superadmin']);

    actingAs($superadmin);

    $response = $this->get('/admin/dashboard');

    $response->assertSuccessful();
});

it('blocks manufacturer user from accessing admin dashboard', function () {
    $user = User::factory()->create([
        'user_type' => 'manufacturer_user',
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);

    actingAs($user);

    $response = $this->get('/admin/dashboard');

    $response->assertForbidden();
});

it('allows sales rep to access rep dashboard', function () {
    $salesRep = User::factory()->create(['user_type' => 'sales_rep']);

    actingAs($salesRep);

    $response = $this->get('/rep/dashboard');

    $response->assertSuccessful();
});

it('blocks manufacturer user from accessing rep dashboard', function () {
    $user = User::factory()->create([
        'user_type' => 'manufacturer_user',
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);

    actingAs($user);

    $response = $this->get('/rep/dashboard');

    $response->assertForbidden();
});
