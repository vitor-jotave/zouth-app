<?php

use App\Models\Manufacturer;
use App\Models\Plan;
use App\Services\PlanLimitService;

test('permanent courtesy overrides an expired trial for only the configured active manufacturer', function () {
    $premium = Plan::factory()->withStripe()->create(['is_active' => true]);
    $basic = Plan::factory()->withStripe()->create();
    $attributes = [
        'is_active' => true,
        'current_plan_id' => $basic->id,
        'trial_started_at' => now()->subDays(9),
        'trial_ends_at' => now()->subDays(2),
    ];
    $recipient = Manufacturer::factory()->create($attributes);
    $other = Manufacturer::factory()->create($attributes);
    $service = app(PlanLimitService::class);

    config([
        'commercial.courtesy.manufacturer_id' => (string) $recipient->id,
        'commercial.courtesy.plan_id' => (string) $premium->id,
    ]);

    expect($service->activePlan($recipient)?->is($premium))->toBeTrue()
        ->and($service->hasOperationalAccess($recipient))->toBeTrue()
        ->and($service->genericTrialHasExpired($recipient))->toBeFalse()
        ->and($recipient->subscriptions()->exists())->toBeFalse()
        ->and($recipient->fresh()->current_plan_id)->toBe($basic->id)
        ->and($service->activePlan($other))->toBeNull()
        ->and($service->hasOperationalAccess($other))->toBeFalse();

    $recipient->update(['is_active' => false]);
    expect($service->courtesyPlan($recipient))->toBeNull()
        ->and($service->hasOperationalAccess($recipient))->toBeFalse();
});

function attachSubscription(Manufacturer $manufacturer, Plan $plan, string $status, ?DateTimeInterface $endsAt = null): void
{
    $manufacturer->subscriptions()->create([
        'type' => 'default',
        'stripe_id' => 'sub_'.fake()->unique()->regexify('[A-Za-z0-9]{14}'),
        'stripe_status' => $status,
        'stripe_price' => $plan->stripe_price_id,
        'ends_at' => $endsAt,
    ]);
}

test('a plan without Stripe can be granted manually', function () {
    $plan = Plan::factory()->create(['stripe_price_id' => null]);
    $manufacturer = Manufacturer::factory()->create(['current_plan_id' => $plan->id]);

    expect(app(PlanLimitService::class)->activePlan($manufacturer)?->is($plan))->toBeTrue();
});

test('a Stripe plan requires a matching entitled subscription', function () {
    $plan = Plan::factory()->withStripe()->create();
    $manufacturer = Manufacturer::factory()->create(['current_plan_id' => $plan->id]);

    expect(app(PlanLimitService::class)->activePlan($manufacturer))->toBeNull();

    attachSubscription($manufacturer, $plan, 'active');

    expect(app(PlanLimitService::class)->activePlan($manufacturer)?->is($plan))->toBeTrue();
});

test('trialing subscriptions grant access', function () {
    $plan = Plan::factory()->withStripe()->create();
    $manufacturer = Manufacturer::factory()->create(['current_plan_id' => $plan->id]);

    attachSubscription($manufacturer, $plan, 'trialing');

    expect(app(PlanLimitService::class)->activePlan($manufacturer)?->is($plan))->toBeTrue();
});

test('an entitled subscription on a historical Stripe price keeps the plan active', function () {
    $legacyPriceId = 'price_legacy_basic';
    $plan = Plan::factory()->withStripe()->create([
        'legacy_stripe_price_ids' => [$legacyPriceId],
    ]);
    $manufacturer = Manufacturer::factory()->create(['current_plan_id' => $plan->id]);

    $manufacturer->subscriptions()->create([
        'type' => 'default',
        'stripe_id' => 'sub_legacy_price',
        'stripe_status' => 'active',
        'stripe_price' => $legacyPriceId,
    ]);

    expect(app(PlanLimitService::class)->activePlan($manufacturer)?->is($plan))->toBeTrue()
        ->and(Plan::findByStripePriceId($legacyPriceId)?->is($plan))->toBeTrue();
});

test('non entitled subscription statuses do not grant access', function (string $status) {
    $plan = Plan::factory()->withStripe()->create();
    $manufacturer = Manufacturer::factory()->create(['current_plan_id' => $plan->id]);

    attachSubscription($manufacturer, $plan, $status);

    expect(app(PlanLimitService::class)->activePlan($manufacturer))->toBeNull();
})->with(['past_due', 'incomplete', 'incomplete_expired', 'unpaid', 'canceled', 'paused']);

test('an expired subscription end date does not grant access', function () {
    $plan = Plan::factory()->withStripe()->create();
    $manufacturer = Manufacturer::factory()->create(['current_plan_id' => $plan->id]);

    attachSubscription($manufacturer, $plan, 'active', now()->subMinute());

    expect(app(PlanLimitService::class)->activePlan($manufacturer))->toBeNull();
});
