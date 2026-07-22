<?php

namespace Database\Factories;

use App\Models\SalesRepresentativeProfile;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SalesRepresentativeProfile>
 */
class SalesRepresentativeProfileFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory()->state(['user_type' => 'sales_rep']),
            'whatsapp' => fake()->numerify('119########'),
            'city' => fake()->city(),
            'state' => fake()->randomElement(['SP', 'SC', 'PR', 'MG', 'GO']),
            'territory' => fake()->randomElement(['Capital e região metropolitana', 'Interior do estado', 'Sul e Sudeste']),
            'presentation' => fake()->paragraph(),
        ];
    }
}
