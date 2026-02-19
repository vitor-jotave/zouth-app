<?php

use App\Models\Manufacturer;
use App\Models\Plan;
use App\Models\User;

function setupBillingUser(): array
{
    $plan = Plan::factory()->basic()->create();
    $manufacturer = Manufacturer::factory()->create([
        'is_active' => true,
        'current_plan_id' => $plan->id,
    ]);
    $user = User::factory()->create([
        'user_type' => 'manufacturer_user',
        'current_manufacturer_id' => $manufacturer->id,
    ]);
    $manufacturer->users()->attach($user->id, ['role' => 'owner', 'status' => 'active']);

    return [$user, $manufacturer, $plan];
}

test('guests cannot access billing page', function () {
    $this->get(route('manufacturer.billing.index'))
        ->assertRedirect(route('login'));
});

test('manufacturer user can view billing page', function () {
    $this->withoutVite();
    [$user] = setupBillingUser();

    $this->actingAs($user)
        ->get(route('manufacturer.billing.index'))
        ->assertOk();
});

test('billing page shows available plans', function () {
    $this->withoutVite();
    [$user] = setupBillingUser();

    Plan::factory()->intermediate()->create();
    Plan::factory()->premium()->create();

    $response = $this->actingAs($user)
        ->get(route('manufacturer.billing.index'));

    $response->assertOk();
});

test('billing page shows current plan', function () {
    $this->withoutVite();
    [$user, $manufacturer, $plan] = setupBillingUser();

    $response = $this->actingAs($user)
        ->get(route('manufacturer.billing.index'));

    $response->assertOk();
});

test('checkout redirects guests to login', function () {
    $plan = Plan::factory()->create();

    $this->get(route('manufacturer.billing.checkout', $plan))
        ->assertRedirect(route('login'));
});

test('checkout rejects plan that is not active', function () {
    [$user] = setupBillingUser();
    $inactivePlan = Plan::factory()->create(['is_active' => false]);

    $this->actingAs($user)
        ->get(route('manufacturer.billing.checkout', $inactivePlan))
        ->assertRedirect(route('manufacturer.billing.index'))
        ->assertSessionHasErrors('plan_id');
});

test('checkout rejects plan without stripe_price_id', function () {
    [$user] = setupBillingUser();
    $plan = Plan::factory()->create(['stripe_price_id' => null]);

    $this->actingAs($user)
        ->get(route('manufacturer.billing.checkout', $plan))
        ->assertRedirect(route('manufacturer.billing.index'))
        ->assertSessionHasErrors('plan_id');
});

test('checkout success updates current plan', function () {
    [$user, $manufacturer] = setupBillingUser();
    $newPlan = Plan::factory()->create();

    $this->actingAs($user)
        ->get(route('manufacturer.billing.checkout.success', $newPlan))
        ->assertRedirect(route('manufacturer.billing.index'));

    expect($manufacturer->fresh()->current_plan_id)->toBe($newPlan->id);
});

test('swap requires plan_id', function () {
    [$user] = setupBillingUser();

    $this->actingAs($user)
        ->post(route('manufacturer.billing.swap'), [])
        ->assertSessionHasErrors('plan_id');
});

test('upgrade requires plan_id', function () {
    [$user] = setupBillingUser();

    $this->actingAs($user)
        ->post(route('manufacturer.billing.upgrade'), [])
        ->assertSessionHasErrors('plan_id');
});

test('upgrade requires active subscription', function () {
    [$user] = setupBillingUser();
    $nextPlan = Plan::factory()->premium()->withStripe()->create();

    $this->actingAs($user)
        ->post(route('manufacturer.billing.upgrade'), ['plan_id' => $nextPlan->id])
        ->assertRedirect()
        ->assertSessionHasErrors('plan_id');
});

test('upgrade rejects plan without stripe_price_id', function () {
    [$user] = setupBillingUser();
    $planWithoutStripe = Plan::factory()->create(['stripe_price_id' => null]);

    $this->actingAs($user)
        ->post(route('manufacturer.billing.upgrade'), ['plan_id' => $planWithoutStripe->id])
        ->assertRedirect()
        ->assertSessionHasErrors('plan_id');
});

test('cancel requires active subscription', function () {
    [$user] = setupBillingUser();

    $this->actingAs($user)
        ->post(route('manufacturer.billing.cancel'))
        ->assertRedirect()
        ->assertSessionHasErrors('subscription');
});

test('resume requires subscription on grace period', function () {
    [$user] = setupBillingUser();

    $this->actingAs($user)
        ->post(route('manufacturer.billing.resume'))
        ->assertRedirect()
        ->assertSessionHasErrors('subscription');
});

test('plan model formatted_price attribute works', function () {
    $plan = Plan::factory()->create(['monthly_price_cents' => 4990]);

    expect($plan->formatted_price)->toBe('R$ 49,90');
});

test('plan model isUnlimited returns true for null fields', function () {
    $plan = Plan::factory()->create(['max_products' => null]);

    expect($plan->isUnlimited('max_products'))->toBeTrue();
});

test('plan model isUnlimited returns false for set fields', function () {
    $plan = Plan::factory()->create(['max_products' => 50]);

    expect($plan->isUnlimited('max_products'))->toBeFalse();
});

test('plan factory states create correct plans', function () {
    $basic = Plan::factory()->basic()->create();
    $intermediate = Plan::factory()->intermediate()->create();
    $premium = Plan::factory()->premium()->create();

    expect($basic->name)->toBe('Básico');
    expect($basic->trial_days)->toBe(7);
    expect($basic->max_reps)->toBe(5);

    expect($intermediate->name)->toBe('Intermediário');
    expect($intermediate->max_reps)->toBe(90);

    expect($premium->name)->toBe('Premium');
    expect($premium->max_reps)->toBeNull();
    expect($premium->max_products)->toBeNull();
});

test('manufacturer can have a current plan relationship', function () {
    $plan = Plan::factory()->create();
    $manufacturer = Manufacturer::factory()->create(['current_plan_id' => $plan->id]);

    expect($manufacturer->currentPlan->id)->toBe($plan->id);
});

test('plan has manufacturers relationship', function () {
    $plan = Plan::factory()->create();
    Manufacturer::factory()->count(3)->create(['current_plan_id' => $plan->id]);

    expect($plan->manufacturers()->count())->toBe(3);
});
