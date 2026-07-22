<?php

namespace Database\Factories;

use App\Models\Manufacturer;
use App\Models\WhatsappQuickReply;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<WhatsappQuickReply>
 */
class WhatsappQuickReplyFactory extends Factory
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
            'shortcut' => fake()->unique()->word(),
            'title' => fake()->sentence(3),
            'body' => fake()->paragraph(),
            'is_active' => true,
        ];
    }
}
