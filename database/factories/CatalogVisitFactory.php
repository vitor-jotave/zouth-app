<?php

namespace Database\Factories;

use App\Models\CatalogSetting;
use App\Models\CatalogVisit;
use App\Models\Manufacturer;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\CatalogVisit>
 */
class CatalogVisitFactory extends Factory
{
    protected $model = CatalogVisit::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'catalog_setting_id' => CatalogSetting::factory(),
            'manufacturer_id' => Manufacturer::factory(),
            'public_token' => Str::random(48),
            'ip_address' => fake()->ipv4(),
            'user_agent' => fake()->userAgent(),
            'referer' => fake()->optional()->url(),
            'visited_at' => fake()->dateTimeBetween('-30 days'),
        ];
    }

    public function forCatalogSetting(CatalogSetting $setting): static
    {
        return $this->state(fn () => [
            'catalog_setting_id' => $setting->id,
            'manufacturer_id' => $setting->manufacturer_id,
            'public_token' => $setting->public_token,
        ]);
    }
}
