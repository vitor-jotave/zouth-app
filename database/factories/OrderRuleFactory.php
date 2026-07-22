<?php

namespace Database\Factories;

use App\Models\Manufacturer;
use App\Models\OrderRule;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<OrderRule>
 */
class OrderRuleFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'manufacturer_id' => Manufacturer::factory(),
            'name' => 'Desconto por valor',
            'description' => fake()->sentence(),
            'is_active' => true,
            'match_mode' => 'all',
            'conditions' => [
                [
                    'metric' => 'subtotal_cents',
                    'operator' => 'gte',
                    'value' => 200000,
                    'max_value' => null,
                    'scope_type' => null,
                    'scope_ids' => [],
                ],
            ],
            'action' => [
                'type' => 'percentage_discount',
                'value' => 500,
            ],
            'public_message' => 'Você liberou 5% de desconto.',
            'sort_order' => 0,
        ];
    }

    public function blocking(): static
    {
        return $this->state(fn (): array => [
            'name' => 'Pedido mínimo',
            'conditions' => [
                [
                    'metric' => 'subtotal_cents',
                    'operator' => 'lte',
                    'value' => 149999,
                    'max_value' => null,
                    'scope_type' => null,
                    'scope_ids' => [],
                ],
            ],
            'action' => ['type' => 'block_checkout', 'value' => null],
            'public_message' => 'O pedido mínimo é de R$ 1.500.',
        ]);
    }
}
