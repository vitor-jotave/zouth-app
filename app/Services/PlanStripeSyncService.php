<?php

namespace App\Services;

use App\Models\Plan;
use Laravel\Cashier\Cashier;

class PlanStripeSyncService
{
    /**
     * Sync a plan to Stripe by creating or updating the Product and Price.
     *
     * Stripe Prices are immutable — if the price changes, a new Price is created
     * and the old one is archived.
     */
    public function sync(Plan $plan): Plan
    {
        $stripe = Cashier::stripe();

        // Create or update Stripe Product
        if ($plan->stripe_product_id) {
            $stripe->products->update($plan->stripe_product_id, [
                'name' => $plan->name,
                'description' => $plan->description ?? '',
                'active' => $plan->is_active,
            ]);
        } else {
            $product = $stripe->products->create([
                'name' => $plan->name,
                'description' => $plan->description ?? '',
                'active' => $plan->is_active,
            ]);

            $plan->stripe_product_id = $product->id;
        }

        // Create new Price if needed (prices are immutable in Stripe)
        $needsNewPrice = ! $plan->stripe_price_id || $plan->wasChanged('monthly_price_cents');

        if ($needsNewPrice) {
            // Archive old price if it exists
            if ($plan->stripe_price_id) {
                $stripe->prices->update($plan->stripe_price_id, [
                    'active' => false,
                ]);
            }

            $price = $stripe->prices->create([
                'product' => $plan->stripe_product_id,
                'unit_amount' => $plan->monthly_price_cents,
                'currency' => strtolower($plan->currency),
                'recurring' => [
                    'interval' => 'month',
                ],
            ]);

            $plan->stripe_price_id = $price->id;
        }

        $plan->saveQuietly();

        return $plan;
    }

    /**
     * Archive a plan's Stripe Product and Price.
     */
    public function archive(Plan $plan): void
    {
        $stripe = Cashier::stripe();

        if ($plan->stripe_price_id) {
            $stripe->prices->update($plan->stripe_price_id, [
                'active' => false,
            ]);
        }

        if ($plan->stripe_product_id) {
            $stripe->products->update($plan->stripe_product_id, [
                'active' => false,
            ]);
        }
    }
}
