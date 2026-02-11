<?php

namespace Database\Factories;

use App\Models\Manufacturer;
use App\Models\Product;
use App\Models\ProductCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Product>
 */
class ProductFactory extends Factory
{
    protected $model = Product::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'manufacturer_id' => Manufacturer::factory(),
            'product_category_id' => ProductCategory::factory(),
            'name' => fake()->words(3, true),
            'sku' => strtoupper(fake()->bothify('SKU-####')),
            'description' => fake()->sentence(),
            'has_size_variants' => false,
            'has_color_variants' => false,
            'base_quantity' => fake()->numberBetween(0, 50),
            'is_active' => true,
            'sort_order' => 0,
        ];
    }

    public function forManufacturer(Manufacturer $manufacturer): static
    {
        return $this->state(fn () => [
            'manufacturer_id' => $manufacturer->id,
        ]);
    }

    public function withoutCategory(): static
    {
        return $this->state(fn () => [
            'product_category_id' => null,
        ]);
    }
}
