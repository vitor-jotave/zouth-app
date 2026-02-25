<?php

namespace Database\Factories;

use App\Models\Manufacturer;
use App\Models\ManufacturerAffiliation;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ManufacturerAffiliation>
 */
class ManufacturerAffiliationFactory extends Factory
{
    protected $model = ManufacturerAffiliation::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'manufacturer_id' => Manufacturer::factory(),
            'user_id' => User::factory()->state(['user_type' => 'sales_rep']),
            'status' => 'pending',
        ];
    }

    public function active(): static
    {
        return $this->state(fn () => ['status' => 'active']);
    }

    public function rejected(): static
    {
        return $this->state(fn () => ['status' => 'rejected']);
    }

    public function revoked(): static
    {
        return $this->state(fn () => ['status' => 'revoked']);
    }
}
