<?php

namespace Database\Factories;

use App\Models\Manufacturer;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Customer>
 */
class CustomerFactory extends Factory
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
            'name' => fake()->name(),
            'phone' => fake()->numerify('(##) #####-####'),
            'email' => fake()->safeEmail(),
            'customer_document_type' => 'cpf',
            'customer_document' => fake()->unique()->numerify('###########'),
            'zip_code' => fake()->numerify('########'),
            'state' => fake()->randomElement(['SP', 'RJ', 'MG', 'PR', 'SC']),
            'city' => fake()->city(),
            'neighborhood' => fake()->streetName(),
            'street' => fake()->streetName(),
            'address_number' => fake()->buildingNumber(),
            'address_complement' => null,
            'address_reference' => null,
        ];
    }

    public function forManufacturer(Manufacturer $manufacturer): static
    {
        return $this->state(fn () => [
            'manufacturer_id' => $manufacturer->id,
        ]);
    }
}
