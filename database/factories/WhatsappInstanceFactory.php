<?php

namespace Database\Factories;

use App\Models\Manufacturer;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\WhatsappInstance>
 */
class WhatsappInstanceFactory extends Factory
{
    public function definition(): array
    {
        return [
            'manufacturer_id' => Manufacturer::factory(),
            'instance_name' => 'wpp-'.fake()->unique()->slug(2),
            'instance_id' => fake()->uuid(),
            'status' => 'disconnected',
            'phone_number' => fake()->numerify('+55119########'),
            'profile_name' => fake()->name(),
            'profile_picture_url' => null,
        ];
    }

    public function connected(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'connected',
        ]);
    }

    public function connecting(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'connecting',
        ]);
    }
}
