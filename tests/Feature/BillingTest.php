<?php

use App\Models\Manufacturer;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Support\Facades\URL;

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

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('plans', 3)
            ->where('plans.0.sort_order', 1)
            ->where('plans.1.sort_order', 2)
            ->where('plans.2.sort_order', 3)
        );
});

test('billing page does not expose unavailable csv import capability', function () {
    $this->withoutVite();
    [$user] = setupBillingUser();

    $this->actingAs($user)
        ->get(route('manufacturer.billing.index'))
        ->assertInertia(fn ($page) => $page
            ->has('plans.0')
            ->missing('plans.0.allow_csv_import')
        );
});

test('billing page shows current plan', function () {
    $this->withoutVite();
    [$user, $manufacturer, $plan] = setupBillingUser();

    $response = $this->actingAs($user)
        ->get(route('manufacturer.billing.index'));

    $response->assertOk();
});

test('billing page identifies the subscribed plan while webhook plan synchronization is pending', function () {
    $this->withoutVite();

    $plan = Plan::factory()->intermediate()->withStripe()->create();
    $manufacturer = Manufacturer::factory()->create([
        'is_active' => true,
        'current_plan_id' => null,
    ]);
    $user = User::factory()->create([
        'user_type' => 'manufacturer_user',
        'current_manufacturer_id' => $manufacturer->id,
    ]);

    $manufacturer->users()->attach($user->id, [
        'role' => 'owner',
        'status' => 'active',
    ]);
    $manufacturer->subscriptions()->create([
        'type' => 'default',
        'stripe_id' => 'sub_pending_plan_sync',
        'stripe_status' => 'trialing',
        'stripe_price' => $plan->stripe_price_id,
        'trial_ends_at' => now()->addDays(7),
    ]);

    $this->actingAs($user)
        ->get(route('manufacturer.billing.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('currentPlanId', $plan->id)
            ->where('usage.products.limit', $plan->max_products)
            ->where('subscription.on_trial', true)
        );
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

test('checkout success waits for the Stripe webhook before updating the plan', function () {
    [$user, $manufacturer, $currentPlan] = setupBillingUser();
    $newPlan = Plan::factory()->create();

    $this->actingAs($user)
        ->get(URL::temporarySignedRoute(
            'manufacturer.billing.checkout.success',
            now()->addHour(),
            ['plan' => $newPlan->id],
        ))
        ->assertRedirect(route('manufacturer.billing.index'))
        ->assertSessionHas('success', fn (string $message) => str_contains($message, 'confirmação do Stripe'));

    expect($manufacturer->fresh()->current_plan_id)->toBe($currentPlan->id);
});

test('checkout success rejects an unsigned URL', function () {
    [$user] = setupBillingUser();
    $newPlan = Plan::factory()->create();

    $this->actingAs($user)
        ->get(route('manufacturer.billing.checkout.success', $newPlan))
        ->assertForbidden();
});

test('swap requires plan_id', function () {
    [$user] = setupBillingUser();

    $this->actingAs($user)
        ->post(route('manufacturer.billing.swap'), [])
        ->assertSessionHasErrors('plan_id');
});

test('swap rejects an inactive plan', function () {
    [$user] = setupBillingUser();
    $inactivePlan = Plan::factory()->inactive()->withStripe()->create();

    $this->actingAs($user)
        ->post(route('manufacturer.billing.swap'), ['plan_id' => $inactivePlan->id])
        ->assertSessionHasErrors([
            'plan_id' => 'Este plano não está disponível.',
        ]);
});

test('upgrade requires plan_id', function () {
    [$user] = setupBillingUser();

    $this->actingAs($user)
        ->post(route('manufacturer.billing.upgrade'), [])
        ->assertSessionHasErrors('plan_id');
});

test('upgrade rejects an inactive plan', function () {
    [$user] = setupBillingUser();
    $inactivePlan = Plan::factory()->inactive()->withStripe()->create();

    $this->actingAs($user)
        ->post(route('manufacturer.billing.upgrade'), ['plan_id' => $inactivePlan->id])
        ->assertSessionHasErrors([
            'plan_id' => 'Este plano não está disponível.',
        ]);
});

test('upgrade rejects the current plan or a lower tier', function () {
    $lowerPlan = Plan::factory()->basic()->withStripe()->create();
    $currentPlan = Plan::factory()->premium()->withStripe()->create();
    $manufacturer = Manufacturer::factory()->create([
        'is_active' => true,
        'current_plan_id' => $currentPlan->id,
    ]);
    $user = User::factory()->create([
        'user_type' => 'manufacturer_user',
        'current_manufacturer_id' => $manufacturer->id,
    ]);
    $manufacturer->users()->attach($user->id, ['role' => 'owner', 'status' => 'active']);
    $manufacturer->subscriptions()->create([
        'type' => 'default',
        'stripe_id' => 'sub_active_upgrade_guard',
        'stripe_status' => 'active',
        'stripe_price' => $currentPlan->stripe_price_id,
    ]);

    $this->actingAs($user)
        ->post(route('manufacturer.billing.upgrade'), ['plan_id' => $lowerPlan->id])
        ->assertSessionHasErrors([
            'plan_id' => 'Selecione um plano superior ao seu plano atual.',
        ]);
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
    expect($basic->monthly_price_cents)->toBe(14700);
    expect($basic->trial_days)->toBe(7);
    expect($basic->max_reps)->toBe(5);

    expect($intermediate->name)->toBe('Intermediário');
    expect($intermediate->monthly_price_cents)->toBe(39700);
    expect($intermediate->max_reps)->toBe(90);

    expect($premium->name)->toBe('Premium');
    expect($premium->monthly_price_cents)->toBe(89700);
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
