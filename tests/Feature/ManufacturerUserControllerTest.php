<?php

use App\Enums\UserType;
use App\Models\Manufacturer;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Support\Facades\Notification;

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
    ]);
});

// ──────────────────────────────────────────────
// Index
// ──────────────────────────────────────────────

it('shows the users index page', function () {
    $this->actingAs($this->owner)
        ->get(route('users.index'))
        ->assertOk();
});

it('denies guests from users index', function () {
    $this->get(route('users.index'))
        ->assertRedirect(route('login'));
});

it('denies sales reps from users index', function () {
    $rep = User::factory()->create(['user_type' => UserType::SalesRep]);

    $this->actingAs($rep)
        ->get(route('users.index'))
        ->assertForbidden();
});

// ──────────────────────────────────────────────
// Store
// ──────────────────────────────────────────────

it('allows owner to create a new user', function () {
    Notification::fake();

    $this->actingAs($this->owner)
        ->post(route('users.store'), [
            'name' => 'Novo Usuario',
            'email' => 'novo@example.com',
            'role' => 'staff',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('users', [
        'email' => 'novo@example.com',
        'user_type' => UserType::ManufacturerUser->value,
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);

    $newUser = User::where('email', 'novo@example.com')->first();

    $this->assertDatabaseHas('manufacturer_user', [
        'user_id' => $newUser->id,
        'manufacturer_id' => $this->manufacturer->id,
        'role' => 'staff',
        'status' => 'active',
    ]);
});

it('denies staff from creating users', function () {
    $staff = User::factory()->create([
        'user_type' => UserType::ManufacturerUser,
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);
    $this->manufacturer->users()->attach($staff->id, [
        'role' => 'staff',
        'status' => 'active',
    ]);

    Notification::fake();

    $this->actingAs($staff)
        ->post(route('users.store'), [
            'name' => 'Blocked',
            'email' => 'blocked@example.com',
            'role' => 'staff',
        ])
        ->assertForbidden();
});

it('validates required fields when creating user', function () {
    $this->actingAs($this->owner)
        ->post(route('users.store'), [])
        ->assertSessionHasErrors(['name', 'email', 'role']);
});

it('rejects duplicate email', function () {
    Notification::fake();

    $this->actingAs($this->owner)
        ->post(route('users.store'), [
            'name' => 'Duplicate',
            'email' => $this->owner->email,
            'role' => 'staff',
        ])
        ->assertSessionHasErrors('email');
});

it('enforces plan user limit', function () {
    Notification::fake();

    $plan = Plan::factory()->create(['max_users' => 1]);
    $this->manufacturer->update(['current_plan_id' => $plan->id]);

    $this->actingAs($this->owner)
        ->post(route('users.store'), [
            'name' => 'Over Limit',
            'email' => 'overlimit@example.com',
            'role' => 'staff',
        ])
        ->assertRedirect()
        ->assertSessionHasErrors('limit');
});

// ──────────────────────────────────────────────
// Update Status
// ──────────────────────────────────────────────

it('allows owner to block a user', function () {
    $staff = User::factory()->create([
        'user_type' => UserType::ManufacturerUser,
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);
    $this->manufacturer->users()->attach($staff->id, [
        'role' => 'staff',
        'status' => 'active',
    ]);

    $this->actingAs($this->owner)
        ->post(route('users.update-status', $staff), ['status' => 'blocked'])
        ->assertRedirect();

    $pivot = $this->manufacturer->users()->wherePivot('user_id', $staff->id)->first();
    expect($pivot->pivot->status)->toBe('blocked');
});

it('rejects invalid status value', function () {
    $staff = User::factory()->create([
        'user_type' => UserType::ManufacturerUser,
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);
    $this->manufacturer->users()->attach($staff->id, [
        'role' => 'staff',
        'status' => 'active',
    ]);

    $this->actingAs($this->owner)
        ->post(route('users.update-status', $staff), ['status' => 'invalid'])
        ->assertSessionHasErrors('status');
});

// ──────────────────────────────────────────────
// Update Role
// ──────────────────────────────────────────────

it('allows owner to change user role', function () {
    $staff = User::factory()->create([
        'user_type' => UserType::ManufacturerUser,
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);
    $this->manufacturer->users()->attach($staff->id, [
        'role' => 'staff',
        'status' => 'active',
    ]);

    $this->actingAs($this->owner)
        ->post(route('users.update-role', $staff), ['role' => 'owner'])
        ->assertRedirect();

    $pivot = $this->manufacturer->users()->wherePivot('user_id', $staff->id)->first();
    expect($pivot->pivot->role)->toBe('owner');
});

it('returns 404 for user not in manufacturer', function () {
    $outsider = User::factory()->create([
        'user_type' => UserType::ManufacturerUser,
    ]);

    $this->actingAs($this->owner)
        ->post(route('users.update-role', $outsider), ['role' => 'staff'])
        ->assertNotFound();
});
