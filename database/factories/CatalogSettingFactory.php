<?php

namespace Database\Factories;

use App\Models\CatalogSetting;
use App\Models\Manufacturer;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\CatalogSetting>
 */
class CatalogSettingFactory extends Factory
{
    protected $model = CatalogSetting::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'manufacturer_id' => Manufacturer::factory(),
            ...CatalogSetting::defaults(fake()->company()),
        ];
    }

    public function forManufacturer(Manufacturer $manufacturer): static
    {
        return $this->state(fn () => [
            'manufacturer_id' => $manufacturer->id,
            'brand_name' => $manufacturer->name,
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn () => [
            'public_link_active' => false,
        ]);
    }
}
