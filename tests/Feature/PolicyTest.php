<?php

use App\Enums\UserType;
use App\Models\Manufacturer;
use App\Models\ManufacturerAffiliation;
use App\Models\Order;
use App\Models\Plan;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\User;

// ─── Helpers ────────────────────────────────────────────────────────────

function manufacturerUser(Manufacturer $manufacturer): User
{
    $user = User::factory()->create([
        'user_type' => UserType::ManufacturerUser,
        'current_manufacturer_id' => $manufacturer->id,
    ]);

    $manufacturer->users()->attach($user->id, ['role' => 'owner', 'status' => 'active']);

    return $user;
}

function salesRepUser(): User
{
    return User::factory()->create([
        'user_type' => UserType::SalesRep,
    ]);
}

// ─── OrderPolicy ────────────────────────────────────────────────────────

test('manufacturer user can view own orders', function () {
    $plan = Plan::factory()->create();
    $manufacturer = Manufacturer::factory()->create(['current_plan_id' => $plan->id]);
    $user = manufacturerUser($manufacturer);

    expect($user->can('viewAny', Order::class))->toBeTrue();
});

test('sales rep cannot view orders via policy', function () {
    $rep = salesRepUser();

    expect($rep->can('viewAny', Order::class))->toBeFalse();
});

test('manufacturer user can view order belonging to their manufacturer', function () {
    $plan = Plan::factory()->create();
    $manufacturer = Manufacturer::factory()->create(['current_plan_id' => $plan->id]);
    $user = manufacturerUser($manufacturer);
    $order = Order::factory()->create(['manufacturer_id' => $manufacturer->id]);

    expect($user->can('view', $order))->toBeTrue();
});

test('manufacturer user cannot view order from another manufacturer', function () {
    $plan = Plan::factory()->create();
    $manufacturer = Manufacturer::factory()->create(['current_plan_id' => $plan->id]);
    $otherManufacturer = Manufacturer::factory()->create(['current_plan_id' => $plan->id]);
    $user = manufacturerUser($manufacturer);
    $order = Order::factory()->create(['manufacturer_id' => $otherManufacturer->id]);

    expect($user->can('view', $order))->toBeFalse();
});

// ─── ProductPolicy ──────────────────────────────────────────────────────

test('manufacturer user can create products', function () {
    $plan = Plan::factory()->create();
    $manufacturer = Manufacturer::factory()->create(['current_plan_id' => $plan->id]);
    $user = manufacturerUser($manufacturer);

    expect($user->can('create', Product::class))->toBeTrue();
});

test('sales rep cannot create products', function () {
    $rep = salesRepUser();

    expect($rep->can('create', Product::class))->toBeFalse();
});

test('manufacturer user can update own product', function () {
    $plan = Plan::factory()->create();
    $manufacturer = Manufacturer::factory()->create(['current_plan_id' => $plan->id]);
    $user = manufacturerUser($manufacturer);
    $product = Product::factory()->create(['manufacturer_id' => $manufacturer->id]);

    expect($user->can('update', $product))->toBeTrue();
});

test('manufacturer user cannot update another manufacturers product', function () {
    $plan = Plan::factory()->create();
    $manufacturer = Manufacturer::factory()->create(['current_plan_id' => $plan->id]);
    $other = Manufacturer::factory()->create(['current_plan_id' => $plan->id]);
    $user = manufacturerUser($manufacturer);
    $product = Product::factory()->create(['manufacturer_id' => $other->id]);

    expect($user->can('update', $product))->toBeFalse();
});

// ─── ProductCategoryPolicy ──────────────────────────────────────────────

test('manufacturer user can create categories', function () {
    $plan = Plan::factory()->create();
    $manufacturer = Manufacturer::factory()->create(['current_plan_id' => $plan->id]);
    $user = manufacturerUser($manufacturer);

    expect($user->can('create', ProductCategory::class))->toBeTrue();
});

test('sales rep cannot create categories', function () {
    $rep = salesRepUser();

    expect($rep->can('create', ProductCategory::class))->toBeFalse();
});

// ─── AffiliationPolicy ──────────────────────────────────────────────────

test('manufacturer user can view affiliations', function () {
    $plan = Plan::factory()->create();
    $manufacturer = Manufacturer::factory()->create(['current_plan_id' => $plan->id]);
    $user = manufacturerUser($manufacturer);

    expect($user->can('viewAny', ManufacturerAffiliation::class))->toBeTrue();
});

test('sales rep cannot view affiliations', function () {
    $rep = salesRepUser();

    expect($rep->can('viewAny', ManufacturerAffiliation::class))->toBeFalse();
});

test('manufacturer user can approve affiliation for their manufacturer', function () {
    $plan = Plan::factory()->create();
    $manufacturer = Manufacturer::factory()->create(['current_plan_id' => $plan->id]);
    $user = manufacturerUser($manufacturer);
    $rep = salesRepUser();

    $affiliation = ManufacturerAffiliation::create([
        'manufacturer_id' => $manufacturer->id,
        'user_id' => $rep->id,
        'status' => 'pending',
    ]);

    expect($user->can('approve', $affiliation))->toBeTrue();
});

test('manufacturer user cannot approve affiliation for another manufacturer', function () {
    $plan = Plan::factory()->create();
    $manufacturer = Manufacturer::factory()->create(['current_plan_id' => $plan->id]);
    $other = Manufacturer::factory()->create(['current_plan_id' => $plan->id]);
    $user = manufacturerUser($manufacturer);
    $rep = salesRepUser();

    $affiliation = ManufacturerAffiliation::create([
        'manufacturer_id' => $other->id,
        'user_id' => $rep->id,
        'status' => 'pending',
    ]);

    expect($user->can('approve', $affiliation))->toBeFalse();
});

test('sales rep cannot approve affiliations', function () {
    $plan = Plan::factory()->create();
    $manufacturer = Manufacturer::factory()->create(['current_plan_id' => $plan->id]);
    $rep = salesRepUser();

    $affiliation = ManufacturerAffiliation::create([
        'manufacturer_id' => $manufacturer->id,
        'user_id' => $rep->id,
        'status' => 'pending',
    ]);

    expect($rep->can('approve', $affiliation))->toBeFalse();
});
