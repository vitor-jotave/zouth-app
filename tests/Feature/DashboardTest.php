<?php

use App\Models\User;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $this->withoutVite();
    $manufacturer = \App\Models\Manufacturer::factory()->create(['is_active' => true]);
    $user = User::factory()->create([
        'user_type' => 'manufacturer_user',
        'current_manufacturer_id' => $manufacturer->id,
    ]);
    $manufacturer->users()->attach($user->id, [
        'role' => 'owner',
        'status' => 'active',
    ]);
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertOk();
});