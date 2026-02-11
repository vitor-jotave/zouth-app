<?php

namespace Database\Factories;

use App\Enums\ProductSize;
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
            'size' => ProductSize::P->value,
            'product_color_id' => null,
            'quantity' => fake()->numberBetween(0, 50),
            'sku_variant' => null,
        ];
    }
}
