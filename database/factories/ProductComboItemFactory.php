<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\ProductComboItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ProductComboItem>
 */
class ProductComboItemFactory extends Factory
{
    protected $model = ProductComboItem::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'combo_product_id' => Product::factory(),
            'component_product_id' => Product::factory(),
            'component_variant_stock_id' => null,
            'variation_key' => null,
            'quantity' => fake()->numberBetween(1, 5),
        ];
    }
}
