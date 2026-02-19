<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Plan>
 */
class PlanFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->word(),
            'description' => fake()->sentence(),
            'is_active' => true,
            'sort_order' => fake()->numberBetween(0, 10),
            'monthly_price_cents' => fake()->randomElement([4990, 9990, 19990]),
            'currency' => 'BRL',
            'trial_days' => 0,
            'max_reps' => fake()->randomElement([5, 20, null]),
            'max_products' => fake()->randomElement([50, 500, null]),
            'max_orders_per_month' => fake()->randomElement([60, 500, null]),
            'max_users' => fake()->randomElement([3, 10, null]),
            'max_data_mb' => fake()->randomElement([500, 2000, null]),
            'max_files_gb' => fake()->randomElement([1, 5, null]),
            'allow_csv_import' => false,
            'stripe_product_id' => null,
            'stripe_price_id' => null,
        ];
    }

    /**
     * A basic plan configuration.
     */
    public function basic(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Básico',
            'monthly_price_cents' => 4990,
            'trial_days' => 7,
            'sort_order' => 1,
            'max_reps' => 5,
            'max_products' => 50,
            'max_orders_per_month' => 60,
            'max_users' => 3,
            'max_data_mb' => 500,
            'max_files_gb' => 1,
            'allow_csv_import' => false,
        ]);
    }

    /**
     * An intermediate plan configuration.
     */
    public function intermediate(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Intermediário',
            'monthly_price_cents' => 9990,
            'trial_days' => 0,
            'sort_order' => 2,
            'max_reps' => 90,
            'max_products' => 500,
            'max_orders_per_month' => 500,
            'max_users' => 10,
            'max_data_mb' => 2000,
            'max_files_gb' => 5,
            'allow_csv_import' => true,
        ]);
    }

    /**
     * A premium plan configuration (unlimited).
     */
    public function premium(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Premium',
            'monthly_price_cents' => 19990,
            'trial_days' => 0,
            'sort_order' => 3,
            'max_reps' => null,
            'max_products' => null,
            'max_orders_per_month' => null,
            'max_users' => null,
            'max_data_mb' => null,
            'max_files_gb' => null,
            'allow_csv_import' => true,
        ]);
    }

    /**
     * Indicate that the plan is inactive.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }

    /**
     * Set Stripe IDs on the plan.
     */
    public function withStripe(): static
    {
        return $this->state(fn (array $attributes) => [
            'stripe_product_id' => 'prod_'.fake()->unique()->regexify('[A-Za-z0-9]{14}'),
            'stripe_price_id' => 'price_'.fake()->unique()->regexify('[A-Za-z0-9]{14}'),
        ]);
    }
}
