<?php

use App\Enums\UserType;
use App\Models\Manufacturer;
use App\Models\User;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\withoutVite;

beforeEach(function () {
    withoutVite();
    Mail::fake();
    $this->superadmin = User::factory()->create(['user_type' => 'superadmin']);
});

it('allows superadmin to view manufacturers list', function () {
    actingAs($this->superadmin);

    $response = $this->get('/admin/manufacturers');

    $response->assertSuccessful();
});

it('blocks non-superadmin from viewing manufacturers list', function () {
    $user = User::factory()->create(['user_type' => 'manufacturer_user']);

    actingAs($user);

    $response = $this->get('/admin/manufacturers');

    $response->assertForbidden();
});

it('allows superadmin to create manufacturer with owner', function () {
    Notification::fake();

    actingAs($this->superadmin);

    $response = $this->post('/admin/manufacturers', [
        'manufacturer_name' => 'Test Manufacturer',
        'owner_name' => 'Test Owner',
        'owner_email' => 'owner@test.com',
        'cnpj' => '11222333000181',
        'phone' => '(11) 99999-9999',
    ]);

    $response->assertRedirect('/admin/manufacturers');
    $response->assertSessionHas('status');

    expect(Manufacturer::where('name', 'Test Manufacturer')->exists())->toBeTrue();
    expect(User::where('email', 'owner@test.com')->exists())->toBeTrue();

    $manufacturer = Manufacturer::where('name', 'Test Manufacturer')->first();
    $owner = User::where('email', 'owner@test.com')->first();

    expect($owner->user_type)->toBe(UserType::ManufacturerUser);
    expect($owner->current_manufacturer_id)->toBe($manufacturer->id);

    // Check pivot relationship
    $pivot = $manufacturer->users()
        ->wherePivot('user_id', $owner->id)
        ->wherePivot('role', 'owner')
        ->wherePivot('status', 'active')
        ->first();

    expect($pivot)->not->toBeNull();
});

it('validates manufacturer creation input', function () {
    actingAs($this->superadmin);

    $response = $this->post('/admin/manufacturers', [
        'manufacturer_name' => '',
        'owner_name' => '',
        'owner_email' => 'invalid-email',
        'cnpj' => '',
        'phone' => '',
    ]);

    $response->assertSessionHasErrors(['manufacturer_name', 'owner_name', 'owner_email', 'cnpj', 'phone']);
});

it('rejects invalid CNPJ on manufacturer creation', function () {
    actingAs($this->superadmin);

    $response = $this->post('/admin/manufacturers', [
        'manufacturer_name' => 'Test',
        'owner_name' => 'Owner',
        'owner_email' => 'owner@test.com',
        'cnpj' => '11111111111111',
        'phone' => '(11) 99999-9999',
    ]);

    $response->assertSessionHasErrors('cnpj');
});

it('allows superadmin to update a manufacturer', function () {
    actingAs($this->superadmin);

    $manufacturer = Manufacturer::factory()->create();

    $response = $this->put("/admin/manufacturers/{$manufacturer->id}", [
        'name' => 'Updated Name',
        'cnpj' => '11222333000181',
        'phone' => '(21) 88888-8888',
        'zip_code' => '01310-100',
        'state' => 'SP',
        'city' => 'São Paulo',
        'neighborhood' => 'Centro',
        'street' => 'Avenida Paulista',
        'address_number' => '1000',
        'complement' => '',
    ]);

    $response->assertRedirect('/admin/manufacturers');
    $response->assertSessionHas('status');

    $manufacturer->refresh();
    expect($manufacturer->name)->toBe('Updated Name');
    expect($manufacturer->phone)->toBe('(21) 88888-8888');
    expect($manufacturer->cnpj)->toBe('11222333000181');
});

it('prevents duplicate CNPJ when updating manufacturer', function () {
    actingAs($this->superadmin);

    Manufacturer::factory()->create(['cnpj' => '11222333000181']);
    $manufacturer = Manufacturer::factory()->create(['cnpj' => '07526557000100']);

    $response = $this->put("/admin/manufacturers/{$manufacturer->id}", [
        'name' => 'Updated',
        'cnpj' => '11222333000181',
        'phone' => '(11) 99999-9999',
    ]);

    $response->assertSessionHasErrors('cnpj');
});

it('prevents duplicate owner email', function () {
    $existingUser = User::factory()->create(['email' => 'existing@test.com']);

    actingAs($this->superadmin);

    $response = $this->post('/admin/manufacturers', [
        'manufacturer_name' => 'Test Manufacturer',
        'owner_name' => 'Test Owner',
        'owner_email' => 'existing@test.com',
        'cnpj' => '11222333000181',
        'phone' => '(11) 99999-9999',
    ]);

    $response->assertSessionHasErrors('owner_email');
});

it('allows superadmin to toggle manufacturer active status', function () {
    actingAs($this->superadmin);

    $manufacturer = Manufacturer::factory()->create(['is_active' => true]);

    $response = $this->post("/admin/manufacturers/{$manufacturer->id}/toggle");

    $response->assertRedirect('/admin/manufacturers');

    $manufacturer->refresh();
    expect($manufacturer->is_active)->toBeFalse();
});

it('clears current_manufacturer_id when deactivating manufacturer', function () {
    actingAs($this->superadmin);

    $manufacturer = Manufacturer::factory()->create(['is_active' => true]);

    $user = User::factory()->create([
        'user_type' => 'manufacturer_user',
        'current_manufacturer_id' => $manufacturer->id,
    ]);

    $manufacturer->users()->attach($user->id, [
        'role' => 'owner',
        'status' => 'active',
    ]);

    $this->post("/admin/manufacturers/{$manufacturer->id}/toggle");

    $user->refresh();
    expect($user->current_manufacturer_id)->toBeNull();
});

it('blocks non-superadmin from creating manufacturers', function () {
    $user = User::factory()->create(['user_type' => 'manufacturer_user']);

    actingAs($user);

    $response = $this->post('/admin/manufacturers', [
        'manufacturer_name' => 'Test Manufacturer',
        'owner_name' => 'Test Owner',
        'owner_email' => 'owner@test.com',
        'cnpj' => '11222333000181',
        'phone' => '(11) 99999-9999',
    ]);

    $response->assertForbidden();
});
