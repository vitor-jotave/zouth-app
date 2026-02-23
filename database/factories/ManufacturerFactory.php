<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Manufacturer>
 */
class ManufacturerFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->company();

        return [
            'name' => $name,
            'slug' => \Illuminate\Support\Str::slug($name),
            'cnpj' => $this->generateValidCnpj(),
            'phone' => fake()->numerify('(##) #####-####'),
            'zip_code' => fake()->numerify('#####-###'),
            'state' => fake()->stateAbbr(),
            'city' => fake()->city(),
            'neighborhood' => fake()->word(),
            'street' => fake()->streetName(),
            'address_number' => (string) fake()->numberBetween(1, 9999),
            'is_active' => true,
        ];
    }

    /**
     * Generate a valid Brazilian CNPJ number (digits only).
     */
    private function generateValidCnpj(): string
    {
        $numbers = array_map(fn () => fake()->numberBetween(0, 9), range(1, 12));

        $weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        $sum = 0;
        for ($i = 0; $i < 12; $i++) {
            $sum += $numbers[$i] * $weights1[$i];
        }
        $remainder = $sum % 11;
        $numbers[] = $remainder < 2 ? 0 : 11 - $remainder;

        $weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        $sum = 0;
        for ($i = 0; $i < 13; $i++) {
            $sum += $numbers[$i] * $weights2[$i];
        }
        $remainder = $sum % 11;
        $numbers[] = $remainder < 2 ? 0 : 11 - $remainder;

        $cnpj = implode('', $numbers);

        // Fallback: if all digits ended up the same, adjust first digit
        if (preg_match('/^(\d)\1{13}$/', $cnpj)) {
            $numbers[0] = ($numbers[0] + 1) % 10;

            return $this->generateValidCnpj();
        }

        return $cnpj;
    }

    /**
     * Indicate that the manufacturer is inactive.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}
