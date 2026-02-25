<?php

namespace Database\Factories;

use App\Models\VariationType;
use App\Models\VariationValue;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\VariationValue>
 */
class VariationValueFactory extends Factory
{
    protected $model = VariationValue::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'variation_type_id' => VariationType::factory(),
            'value' => fake()->word(),
            'hex' => null,
            'display_order' => 0,
        ];
    }
}
