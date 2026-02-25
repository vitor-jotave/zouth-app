<?php

namespace Database\Factories;

use App\Models\Manufacturer;
use App\Models\VariationType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\VariationType>
 */
class VariationTypeFactory extends Factory
{
    protected $model = VariationType::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'manufacturer_id' => Manufacturer::factory(),
            'name' => fake()->randomElement(['Tamanho', 'Cor', 'Material', 'Estilo']),
            'is_color_type' => false,
            'display_order' => 0,
        ];
    }

    public function colorType(): static
    {
        return $this->state(fn () => [
            'name' => 'Cor',
            'is_color_type' => true,
        ]);
    }
}
