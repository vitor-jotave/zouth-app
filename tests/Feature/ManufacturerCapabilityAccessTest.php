<?php

use App\Enums\UserType;
use App\Models\Manufacturer;
use App\Models\Plan;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

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
        'capabilities' => [],
    ]);
});

it('lets a collaborator enter only the areas selected by an owner', function () {
    $staff = User::factory()->create([
        'user_type' => UserType::ManufacturerUser,
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);
    $this->manufacturer->users()->attach($staff->id, [
        'role' => 'staff',
        'status' => 'active',
        'capabilities' => ['orders.manage'],
    ]);

    $this->actingAs($staff)
        ->get(route('manufacturer.orders.index'))
        ->assertOk();

    $this->actingAs($staff)
        ->get(route('manufacturer.products.index'))
        ->assertForbidden();

    $this->actingAs($staff)
        ->get(route('manufacturer.customers.index'))
        ->assertForbidden();

    $this->actingAs($staff)
        ->get(route('users.index'))
        ->assertForbidden();

    $this->actingAs($staff)
        ->get(route('manufacturer.billing.index'))
        ->assertForbidden();
});

it('gives owners every area regardless of stored capabilities', function () {
    $this->actingAs($this->owner)
        ->get(route('manufacturer.products.index'))
        ->assertOk();

    $this->actingAs($this->owner)
        ->get(route('users.index'))
        ->assertOk();
});

it('shares translated membership access with the inertia interface', function () {
    $staff = User::factory()->create([
        'user_type' => UserType::ManufacturerUser,
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);
    $this->manufacturer->users()->attach($staff->id, [
        'role' => 'staff',
        'status' => 'active',
        'capabilities' => ['orders.manage', 'customers.manage'],
    ]);

    $this->actingAs($staff)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('auth.access.role', 'staff')
            ->where('auth.access.is_owner', false)
            ->where('auth.access.capabilities', [
                'orders.manage',
                'customers.manage',
            ]));
});

it('keeps legacy collaborators working until an owner saves explicit areas', function () {
    $staff = User::factory()->create([
        'user_type' => UserType::ManufacturerUser,
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);
    $this->manufacturer->users()->attach($staff->id, [
        'role' => 'staff',
        'status' => 'active',
        'capabilities' => null,
    ]);

    $this->actingAs($staff)
        ->get(route('manufacturer.products.index'))
        ->assertOk();

    $this->actingAs($staff)
        ->get(route('manufacturer.atendimento.index'))
        ->assertOk();
});
