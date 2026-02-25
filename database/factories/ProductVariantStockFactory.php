<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\ProductVariantStock;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ProductVariantStock>
 */
class ProductVariantStockFactory extends Factory
{
    protected $model = ProductVariantStock::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'product_id' => Product::factory(),
            'variation_key' => ['Tamanho' => 'M'],
            'quantity' => fake()->numberBetween(0, 50),
            'price_cents' => null,
            'sku_variant' => null,
        ];
    }
}
