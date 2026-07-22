<?php

namespace Database\Factories;

use App\Models\Manufacturer;
use App\Models\WhatsappAutomation;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<WhatsappAutomation>
 */
class WhatsappAutomationFactory extends Factory
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
            'name' => fake()->words(3, true),
            'is_active' => false,
            'definition' => WhatsappAutomation::starterDefinition(),
            'last_activated_at' => null,
        ];
    }

    public function active(): static
    {
        return $this->state(fn () => [
            'is_active' => true,
            'last_activated_at' => now(),
        ]);
    }
}
