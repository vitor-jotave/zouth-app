<?php

namespace Database\Factories;

use App\Models\Manufacturer;
use App\Models\ProductCategory;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ProductCategory>
 */
class ProductCategoryFactory extends Factory
{
    protected $model = ProductCategory::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->words(2, true);

        return [
            'manufacturer_id' => Manufacturer::factory(),
            'name' => $name,
            'slug' => Str::slug($name),
        ];
    }

    public function forManufacturer(Manufacturer $manufacturer): static
    {
        return $this->state(fn () => [
            'manufacturer_id' => $manufacturer->id,
        ]);
    }
}
