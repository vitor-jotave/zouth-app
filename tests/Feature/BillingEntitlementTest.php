<?php

use App\Models\Manufacturer;
use App\Models\Plan;
use App\Services\PlanLimitService;

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
