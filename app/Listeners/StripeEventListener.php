<?php

namespace App\Listeners;

use App\Models\Manufacturer;
use App\Models\Plan;
use Illuminate\Support\Facades\Log;
use Laravel\Cashier\Events\WebhookReceived;

class StripeEventListener
{
    /**
     * Handle incoming Stripe webhook events dispatched by Cashier.
     *
     * Cashier already syncs the subscriptions/subscription_items tables,
     * but our app tracks the active plan via `manufacturers.current_plan_id`.
     * This listener keeps that column in sync with Stripe's reality.
     */
    public function handle(WebhookReceived $event): void
    {
        $type = $event->payload['type'] ?? null;

        match ($type) {
            'customer.subscription.created' => $this->handleSubscriptionCreated($event->payload),
            'customer.subscription.updated' => $this->handleSubscriptionUpdated($event->payload),
            'customer.subscription.deleted' => $this->handleSubscriptionDeleted($event->payload),
            'invoice.payment_action_required' => $this->handlePaymentActionRequired($event->payload),
            'invoice.payment_succeeded' => $this->handlePaymentSucceeded($event->payload),
            default => null,
        };
    }

    /**
     * A new subscription was created — sync current_plan_id.
     *
     * @param  array<string, mixed>  $payload
     */
    protected function handleSubscriptionCreated(array $payload): void
    {
        $this->syncPlanFromSubscription($payload);
    }

    /**
     * A subscription was updated (plan swap, trial end, status change, etc.).
     *
     * @param  array<string, mixed>  $payload
     */
    protected function handleSubscriptionUpdated(array $payload): void
    {
        $subscription = $payload['data']['object'] ?? [];
        $status = $subscription['status'] ?? null;

        // If the subscription went to an inactive state, clear the plan.
        if (in_array($status, ['canceled', 'unpaid', 'incomplete_expired'])) {
            $this->clearPlanForCustomer($subscription['customer'] ?? null, $status);

            return;
        }

        // For active/trialing/past_due — sync the plan from the price.
        $this->syncPlanFromSubscription($payload);
    }

    /**
     * Subscription was fully deleted in Stripe — clear current_plan_id.
     *
     * @param  array<string, mixed>  $payload
     */
    protected function handleSubscriptionDeleted(array $payload): void
    {
        $subscription = $payload['data']['object'] ?? [];
        $this->clearPlanForCustomer($subscription['customer'] ?? null, 'deleted');
    }

    /**
     * Payment requires additional action (e.g. 3D Secure).
     *
     * @param  array<string, mixed>  $payload
     */
    protected function handlePaymentActionRequired(array $payload): void
    {
        $invoice = $payload['data']['object'] ?? [];
        $stripeCustomerId = $invoice['customer'] ?? null;

        $manufacturer = $this->findManufacturer($stripeCustomerId);

        if ($manufacturer) {
            Log::warning('Stripe: payment action required', [
                'manufacturer_id' => $manufacturer->id,
                'manufacturer_name' => $manufacturer->name,
                'invoice_id' => $invoice['id'] ?? null,
                'amount_due' => $invoice['amount_due'] ?? null,
            ]);
        }
    }

    /**
     * Invoice payment succeeded — ensure plan is synced.
     *
     * @param  array<string, mixed>  $payload
     */
    protected function handlePaymentSucceeded(array $payload): void
    {
        $invoice = $payload['data']['object'] ?? [];
        $stripeCustomerId = $invoice['customer'] ?? null;
        $subscriptionId = $invoice['subscription'] ?? null;

        if (! $stripeCustomerId || ! $subscriptionId) {
            return;
        }

        $manufacturer = $this->findManufacturer($stripeCustomerId);

        if (! $manufacturer) {
            return;
        }

        // Get the subscription's current price from the local DB (Cashier already synced it).
        $subscription = $manufacturer->subscriptions()
            ->where('stripe_id', $subscriptionId)
            ->first();

        if (! $subscription) {
            return;
        }

        $priceId = $subscription->stripe_price;

        if ($priceId) {
            $plan = Plan::where('stripe_price_id', $priceId)->first();

            if ($plan && $manufacturer->current_plan_id !== $plan->id) {
                $manufacturer->update(['current_plan_id' => $plan->id]);

                Log::info('Stripe: plan synced after successful payment', [
                    'manufacturer_id' => $manufacturer->id,
                    'plan_id' => $plan->id,
                ]);
            }
        }
    }

    /**
     * Sync current_plan_id from a subscription webhook payload.
     *
     * @param  array<string, mixed>  $payload
     */
    protected function syncPlanFromSubscription(array $payload): void
    {
        $subscription = $payload['data']['object'] ?? [];
        $stripeCustomerId = $subscription['customer'] ?? null;

        $manufacturer = $this->findManufacturer($stripeCustomerId);

        if (! $manufacturer) {
            Log::warning('Stripe webhook: manufacturer not found for customer', [
                'stripe_customer_id' => $stripeCustomerId,
            ]);

            return;
        }

        // Extract the price ID from the subscription items.
        $priceId = $this->extractPriceId($subscription);

        if (! $priceId) {
            Log::warning('Stripe webhook: no price ID found in subscription', [
                'manufacturer_id' => $manufacturer->id,
                'subscription_id' => $subscription['id'] ?? null,
            ]);

            return;
        }

        $plan = Plan::where('stripe_price_id', $priceId)->first();

        if (! $plan) {
            Log::warning('Stripe webhook: no matching plan for price', [
                'manufacturer_id' => $manufacturer->id,
                'stripe_price_id' => $priceId,
            ]);

            return;
        }

        if ($manufacturer->current_plan_id !== $plan->id) {
            $manufacturer->update(['current_plan_id' => $plan->id]);

            Log::info('Stripe webhook: manufacturer plan synced', [
                'manufacturer_id' => $manufacturer->id,
                'plan_id' => $plan->id,
                'plan_name' => $plan->name,
                'event' => $payload['type'],
            ]);
        }
    }

    /**
     * Clear current_plan_id when a subscription is no longer active.
     */
    protected function clearPlanForCustomer(?string $stripeCustomerId, string $reason): void
    {
        if (! $stripeCustomerId) {
            return;
        }

        $manufacturer = $this->findManufacturer($stripeCustomerId);

        if (! $manufacturer) {
            return;
        }

        if ($manufacturer->current_plan_id !== null) {
            $manufacturer->update(['current_plan_id' => null]);

            Log::info('Stripe webhook: manufacturer plan cleared', [
                'manufacturer_id' => $manufacturer->id,
                'reason' => $reason,
            ]);
        }
    }

    /**
     * Find a manufacturer by Stripe customer ID.
     */
    protected function findManufacturer(?string $stripeCustomerId): ?Manufacturer
    {
        if (! $stripeCustomerId) {
            return null;
        }

        return Manufacturer::where('stripe_id', $stripeCustomerId)->first();
    }

    /**
     * Extract the first price ID from a Stripe subscription object.
     */
    protected function extractPriceId(array $subscription): ?string
    {
        return $subscription['items']['data'][0]['price']['id'] ?? null;
    }
}
