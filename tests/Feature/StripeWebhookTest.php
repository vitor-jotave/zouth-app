<?php

use App\Listeners\StripeEventListener;
use App\Models\Manufacturer;
use App\Models\Plan;
use Illuminate\Support\Facades\Log;
use Laravel\Cashier\Events\WebhookReceived;

/**
 * Build a fake Stripe webhook payload.
 *
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function stripePayload(string $type, array $overrides = []): array
{
    return array_merge([
        'id' => 'evt_'.fake()->regexify('[A-Za-z0-9]{14}'),
        'type' => $type,
        'data' => [
            'object' => [],
        ],
    ], $overrides);
}

/**
 * Build a subscription object payload with items.
 *
 * @return array<string, mixed>
 */
function subscriptionObject(string $customerId, string $priceId, string $status = 'active'): array
{
    return [
        'id' => 'sub_'.fake()->regexify('[A-Za-z0-9]{14}'),
        'customer' => $customerId,
        'status' => $status,
        'items' => [
            'data' => [
                [
                    'price' => [
                        'id' => $priceId,
                    ],
                ],
            ],
        ],
    ];
}

test('subscription created event syncs current_plan_id', function () {
    $plan = Plan::factory()->withStripe()->create();
    $manufacturer = Manufacturer::factory()->create([
        'stripe_id' => 'cus_test123',
        'current_plan_id' => null,
    ]);

    $payload = stripePayload('customer.subscription.created', [
        'data' => [
            'object' => subscriptionObject('cus_test123', $plan->stripe_price_id),
        ],
    ]);

    $listener = new StripeEventListener;
    $listener->handle(new WebhookReceived($payload));

    expect($manufacturer->fresh()->current_plan_id)->toBe($plan->id);
});

test('subscription updated event syncs current_plan_id on plan swap', function () {
    $oldPlan = Plan::factory()->basic()->withStripe()->create();
    $newPlan = Plan::factory()->premium()->withStripe()->create();
    $manufacturer = Manufacturer::factory()->create([
        'stripe_id' => 'cus_swap456',
        'current_plan_id' => $oldPlan->id,
    ]);

    $payload = stripePayload('customer.subscription.updated', [
        'data' => [
            'object' => subscriptionObject('cus_swap456', $newPlan->stripe_price_id),
        ],
    ]);

    $listener = new StripeEventListener;
    $listener->handle(new WebhookReceived($payload));

    expect($manufacturer->fresh()->current_plan_id)->toBe($newPlan->id);
});

test('subscription updated with canceled status clears current_plan_id', function () {
    $plan = Plan::factory()->withStripe()->create();
    $manufacturer = Manufacturer::factory()->create([
        'stripe_id' => 'cus_cancel789',
        'current_plan_id' => $plan->id,
    ]);

    $payload = stripePayload('customer.subscription.updated', [
        'data' => [
            'object' => subscriptionObject('cus_cancel789', $plan->stripe_price_id, 'canceled'),
        ],
    ]);

    $listener = new StripeEventListener;
    $listener->handle(new WebhookReceived($payload));

    expect($manufacturer->fresh()->current_plan_id)->toBeNull();
});

test('subscription updated with unpaid status clears current_plan_id', function () {
    $plan = Plan::factory()->withStripe()->create();
    $manufacturer = Manufacturer::factory()->create([
        'stripe_id' => 'cus_unpaid001',
        'current_plan_id' => $plan->id,
    ]);

    $payload = stripePayload('customer.subscription.updated', [
        'data' => [
            'object' => subscriptionObject('cus_unpaid001', $plan->stripe_price_id, 'unpaid'),
        ],
    ]);

    $listener = new StripeEventListener;
    $listener->handle(new WebhookReceived($payload));

    expect($manufacturer->fresh()->current_plan_id)->toBeNull();
});

test('subscription updated with incomplete_expired status clears current_plan_id', function () {
    $plan = Plan::factory()->withStripe()->create();
    $manufacturer = Manufacturer::factory()->create([
        'stripe_id' => 'cus_expired002',
        'current_plan_id' => $plan->id,
    ]);

    $payload = stripePayload('customer.subscription.updated', [
        'data' => [
            'object' => subscriptionObject('cus_expired002', $plan->stripe_price_id, 'incomplete_expired'),
        ],
    ]);

    $listener = new StripeEventListener;
    $listener->handle(new WebhookReceived($payload));

    expect($manufacturer->fresh()->current_plan_id)->toBeNull();
});

test('subscription updated with active status keeps plan synced', function () {
    $plan = Plan::factory()->withStripe()->create();
    $manufacturer = Manufacturer::factory()->create([
        'stripe_id' => 'cus_active003',
        'current_plan_id' => $plan->id,
    ]);

    $payload = stripePayload('customer.subscription.updated', [
        'data' => [
            'object' => subscriptionObject('cus_active003', $plan->stripe_price_id, 'active'),
        ],
    ]);

    $listener = new StripeEventListener;
    $listener->handle(new WebhookReceived($payload));

    expect($manufacturer->fresh()->current_plan_id)->toBe($plan->id);
});

test('subscription updated with past_due status keeps plan synced', function () {
    $plan = Plan::factory()->withStripe()->create();
    $manufacturer = Manufacturer::factory()->create([
        'stripe_id' => 'cus_pastdue004',
        'current_plan_id' => $plan->id,
    ]);

    $payload = stripePayload('customer.subscription.updated', [
        'data' => [
            'object' => subscriptionObject('cus_pastdue004', $plan->stripe_price_id, 'past_due'),
        ],
    ]);

    $listener = new StripeEventListener;
    $listener->handle(new WebhookReceived($payload));

    expect($manufacturer->fresh()->current_plan_id)->toBe($plan->id);
});

test('subscription deleted event clears current_plan_id', function () {
    $plan = Plan::factory()->withStripe()->create();
    $manufacturer = Manufacturer::factory()->create([
        'stripe_id' => 'cus_deleted005',
        'current_plan_id' => $plan->id,
    ]);

    $payload = stripePayload('customer.subscription.deleted', [
        'data' => [
            'object' => subscriptionObject('cus_deleted005', $plan->stripe_price_id, 'canceled'),
        ],
    ]);

    $listener = new StripeEventListener;
    $listener->handle(new WebhookReceived($payload));

    expect($manufacturer->fresh()->current_plan_id)->toBeNull();
});

test('payment action required logs a warning', function () {
    Log::spy();

    Manufacturer::factory()->create([
        'stripe_id' => 'cus_action006',
    ]);

    $payload = stripePayload('invoice.payment_action_required', [
        'data' => [
            'object' => [
                'id' => 'in_test_invoice',
                'customer' => 'cus_action006',
                'amount_due' => 4990,
            ],
        ],
    ]);

    $listener = new StripeEventListener;
    $listener->handle(new WebhookReceived($payload));

    Log::shouldHaveReceived('warning')
        ->withArgs(fn (string $message) => str_contains($message, 'payment action required'))
        ->once();
});

test('unknown event type is silently ignored', function () {
    Log::spy();

    $payload = stripePayload('charge.succeeded', [
        'data' => [
            'object' => [
                'customer' => 'cus_unknown007',
            ],
        ],
    ]);

    $listener = new StripeEventListener;
    $listener->handle(new WebhookReceived($payload));

    Log::shouldNotHaveReceived('warning');
    Log::shouldNotHaveReceived('info');
});

test('webhook with unknown customer is handled gracefully', function () {
    Log::spy();

    $plan = Plan::factory()->withStripe()->create();

    $payload = stripePayload('customer.subscription.created', [
        'data' => [
            'object' => subscriptionObject('cus_nonexistent', $plan->stripe_price_id),
        ],
    ]);

    $listener = new StripeEventListener;
    $listener->handle(new WebhookReceived($payload));

    Log::shouldHaveReceived('warning')
        ->withArgs(fn (string $message) => str_contains($message, 'manufacturer not found'))
        ->once();
});

test('webhook with unknown price is handled gracefully', function () {
    Log::spy();

    Manufacturer::factory()->create([
        'stripe_id' => 'cus_unknownprice',
    ]);

    $payload = stripePayload('customer.subscription.created', [
        'data' => [
            'object' => subscriptionObject('cus_unknownprice', 'price_nonexistent'),
        ],
    ]);

    $listener = new StripeEventListener;
    $listener->handle(new WebhookReceived($payload));

    Log::shouldHaveReceived('warning')
        ->withArgs(fn (string $message) => str_contains($message, 'no matching plan'))
        ->once();
});

test('listener is registered in AppServiceProvider', function () {
    $events = app('events');

    expect($events->hasListeners(WebhookReceived::class))->toBeTrue();
});
