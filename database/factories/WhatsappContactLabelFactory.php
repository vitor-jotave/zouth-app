<?php

namespace Database\Factories;

use App\Models\Manufacturer;
use App\Models\WhatsappContactLabel;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<WhatsappContactLabel>
 */
class WhatsappContactLabelFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->word();

        return ['manufacturer_id' => Manufacturer::factory(), 'name' => $name, 'name_key' => mb_strtolower($name), 'color' => '#ff4d3d'];
    }
}
