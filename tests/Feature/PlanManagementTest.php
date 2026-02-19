<?php

use App\Models\Manufacturer;
use App\Models\Plan;
use App\Models\User;

function createSuperadmin(): User
{
    return User::factory()->create([
        'user_type' => 'superadmin',
        'current_manufacturer_id' => null,
    ]);
}

function createManufacturerUser(): array
{
    $manufacturer = Manufacturer::factory()->create(['is_active' => true]);
    $user = User::factory()->create([
        'user_type' => 'manufacturer_user',
        'current_manufacturer_id' => $manufacturer->id,
    ]);
    $manufacturer->users()->attach($user->id, ['role' => 'owner', 'status' => 'active']);

    return [$user, $manufacturer];
}

test('guests cannot access plan management', function () {
    $this->get(route('admin.plans.index'))->assertRedirect(route('login'));
});

test('manufacturer users cannot access plan management', function () {
    [$user] = createManufacturerUser();

    $this->actingAs($user)
        ->get(route('admin.plans.index'))
        ->assertForbidden();
});

test('superadmin can view plans index', function () {
    $this->withoutVite();

    Plan::factory()->count(3)->create();

    $this->actingAs(createSuperadmin())
        ->get(route('admin.plans.index'))
        ->assertOk();
});

test('superadmin can view create plan page', function () {
    $this->withoutVite();

    $this->actingAs(createSuperadmin())
        ->get(route('admin.plans.create'))
        ->assertOk();
});

test('superadmin can create a plan', function () {
    $this->actingAs(createSuperadmin())
        ->post(route('admin.plans.store'), [
            'name' => 'Teste Plan',
            'description' => 'A test plan',
            'is_active' => true,
            'sort_order' => 1,
            'monthly_price' => '49,90',
            'trial_days' => 7,
            'max_reps' => 5,
            'max_products' => 50,
            'max_orders_per_month' => 60,
            'max_users' => 3,
            'max_data_mb' => 500,
            'max_files_gb' => 1,
            'allow_csv_import' => false,
        ])
        ->assertRedirect(route('admin.plans.index'));

    $plan = Plan::where('name', 'Teste Plan')->first();
    expect($plan)->not->toBeNull();
    expect($plan->monthly_price_cents)->toBe(4990);
    expect($plan->trial_days)->toBe(7);
    expect($plan->max_reps)->toBe(5);
    expect($plan->max_products)->toBe(50);
    expect($plan->allow_csv_import)->toBeFalse();
});

test('superadmin can create a plan with decimal dot price', function () {
    $this->actingAs(createSuperadmin())
        ->post(route('admin.plans.store'), [
            'name' => 'Dot Plan',
            'monthly_price' => '99.90',
            'is_active' => true,
            'sort_order' => 0,
            'trial_days' => 0,
            'allow_csv_import' => true,
        ])
        ->assertRedirect(route('admin.plans.index'));

    $plan = Plan::where('name', 'Dot Plan')->first();
    expect($plan->monthly_price_cents)->toBe(9990);
    expect($plan->allow_csv_import)->toBeTrue();
});

test('superadmin can create a plan with unlimited limits', function () {
    $this->actingAs(createSuperadmin())
        ->post(route('admin.plans.store'), [
            'name' => 'Unlimited Plan',
            'monthly_price' => '199.90',
            'is_active' => true,
            'sort_order' => 0,
            'trial_days' => 0,
            'allow_csv_import' => true,
            'max_reps' => null,
            'max_products' => null,
            'max_orders_per_month' => null,
            'max_users' => null,
        ])
        ->assertRedirect(route('admin.plans.index'));

    $plan = Plan::where('name', 'Unlimited Plan')->first();
    expect($plan->max_reps)->toBeNull();
    expect($plan->max_products)->toBeNull();
    expect($plan->max_orders_per_month)->toBeNull();
    expect($plan->max_users)->toBeNull();
});

test('plan creation requires a name', function () {
    $this->actingAs(createSuperadmin())
        ->post(route('admin.plans.store'), [
            'monthly_price' => '49,90',
            'is_active' => true,
            'sort_order' => 0,
            'trial_days' => 0,
            'allow_csv_import' => false,
        ])
        ->assertSessionHasErrors('name');
});

test('plan creation requires a price', function () {
    $this->actingAs(createSuperadmin())
        ->post(route('admin.plans.store'), [
            'name' => 'No Price Plan',
            'is_active' => true,
            'sort_order' => 0,
            'trial_days' => 0,
            'allow_csv_import' => false,
        ])
        ->assertSessionHasErrors('monthly_price');
});

test('superadmin can view edit plan page', function () {
    $this->withoutVite();

    $plan = Plan::factory()->create();

    $this->actingAs(createSuperadmin())
        ->get(route('admin.plans.edit', $plan))
        ->assertOk();
});

test('superadmin can update a plan', function () {
    $plan = Plan::factory()->create([
        'name' => 'Old Name',
        'monthly_price_cents' => 4990,
    ]);

    $this->actingAs(createSuperadmin())
        ->put(route('admin.plans.update', $plan), [
            'name' => 'New Name',
            'monthly_price' => '79,90',
            'is_active' => true,
            'sort_order' => 2,
            'trial_days' => 14,
            'max_reps' => 10,
            'max_products' => 100,
            'allow_csv_import' => true,
        ])
        ->assertRedirect(route('admin.plans.index'));

    $plan->refresh();
    expect($plan->name)->toBe('New Name');
    expect($plan->monthly_price_cents)->toBe(7990);
    expect($plan->trial_days)->toBe(14);
    expect($plan->max_reps)->toBe(10);
    expect($plan->allow_csv_import)->toBeTrue();
});

test('superadmin can toggle plan active status', function () {
    $plan = Plan::factory()->create(['is_active' => true]);

    $this->actingAs(createSuperadmin())
        ->post(route('admin.plans.toggle', $plan))
        ->assertRedirect();

    expect($plan->fresh()->is_active)->toBeFalse();

    $this->actingAs(createSuperadmin())
        ->post(route('admin.plans.toggle', $plan))
        ->assertRedirect();

    expect($plan->fresh()->is_active)->toBeTrue();
});

test('manufacturer user cannot create a plan', function () {
    [$user] = createManufacturerUser();

    $this->actingAs($user)
        ->post(route('admin.plans.store'), [
            'name' => 'Hack Plan',
            'monthly_price' => '1.00',
            'is_active' => true,
            'sort_order' => 0,
            'trial_days' => 0,
            'allow_csv_import' => false,
        ])
        ->assertForbidden();
});
