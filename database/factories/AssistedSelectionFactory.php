<?php

namespace Database\Factories;

use App\Models\AssistedSelection;
use App\Models\CatalogSetting;
use App\Models\ManufacturerAffiliation;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AssistedSelection>
 */
class AssistedSelectionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'manufacturer_affiliation_id' => ManufacturerAffiliation::factory()->active(),
            'catalog_setting_id' => fn (array $attributes) => CatalogSetting::factory()->create([
                'manufacturer_id' => ManufacturerAffiliation::query()->findOrFail($attributes['manufacturer_affiliation_id'])->manufacturer_id,
            ])->id,
            'token' => fake()->uuid(),
            'items' => [],
            'expires_at' => now()->addDays(14),
        ];
    }
}
