<?php

use App\Models\Manufacturer;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\assertAuthenticated;
use function Pest\Laravel\assertGuest;

beforeEach(function () {
    // Create a manufacturer
    $this->manufacturer = Manufacturer::factory()->create(['is_active' => true]);
});

it('redirects superadmin to admin dashboard after login', function () {
    $superadmin = User::factory()->create([
        'user_type' => 'superadmin',
        'current_manufacturer_id' => null,
        'password' => Hash::make('password'),
    ]);

    $response = $this->post('/login', [
        'email' => $superadmin->email,
        'password' => 'password',
    ]);

    assertAuthenticated();
    $response->assertRedirect('/admin/dashboard');

    $superadmin->refresh();
    expect($superadmin->current_manufacturer_id)->toBeNull();
});

it('redirects manufacturer user to dashboard and sets current manufacturer', function () {
    $user = User::factory()->create([
        'user_type' => 'manufacturer_user',
        'current_manufacturer_id' => null,
        'password' => Hash::make('password'),
    ]);

    // Attach user to manufacturer with active membership
    $this->manufacturer->users()->attach($user->id, [
        'role' => 'owner',
        'status' => 'active',
    ]);

    $response = $this->post('/login', [
        'email' => $user->email,
        'password' => 'password',
    ]);

    assertAuthenticated();
    $response->assertRedirect('/dashboard');

    $user->refresh();
    expect($user->current_manufacturer_id)->toBe($this->manufacturer->id);
});

it('denies login for manufacturer user with inactive manufacturer', function () {
    $inactiveManufacturer = Manufacturer::factory()->create(['is_active' => false]);

    $user = User::factory()->create([
        'user_type' => 'manufacturer_user',
        'current_manufacturer_id' => null,
        'password' => Hash::make('password'),
    ]);

    $inactiveManufacturer->users()->attach($user->id, [
        'role' => 'owner',
        'status' => 'active',
    ]);

    $response = $this->post('/login', [
        'email' => $user->email,
        'password' => 'password',
    ]);

    assertGuest();
    $response->assertRedirect('/login');
    $response->assertSessionHasErrors('email');
});

it('denies login for manufacturer user with no active manufacturer', function () {
    $user = User::factory()->create([
        'user_type' => 'manufacturer_user',
        'current_manufacturer_id' => null,
        'password' => Hash::make('password'),
    ]);

    $response = $this->post('/login', [
        'email' => $user->email,
        'password' => 'password',
    ]);

    assertGuest();
    $response->assertRedirect('/login');
    $response->assertSessionHasErrors('email');
});

it('denies login for manufacturer user with blocked membership', function () {
    $user = User::factory()->create([
        'user_type' => 'manufacturer_user',
        'current_manufacturer_id' => null,
        'password' => Hash::make('password'),
    ]);

    $this->manufacturer->users()->attach($user->id, [
        'role' => 'staff',
        'status' => 'blocked',
    ]);

    $response = $this->post('/login', [
        'email' => $user->email,
        'password' => 'password',
    ]);

    assertGuest();
    $response->assertRedirect('/login');
    $response->assertSessionHasErrors('email');
});

it('redirects sales rep to rep dashboard after login', function () {
    $salesRep = User::factory()->create([
        'user_type' => 'sales_rep',
        'current_manufacturer_id' => null,
        'password' => Hash::make('password'),
    ]);

    $response = $this->post('/login', [
        'email' => $salesRep->email,
        'password' => 'password',
    ]);

    assertAuthenticated();
    $response->assertRedirect('/rep/dashboard');

    $salesRep->refresh();
    expect($salesRep->current_manufacturer_id)->toBeNull();
});
