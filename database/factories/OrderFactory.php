<?php

namespace Database\Factories;

use App\Enums\OrderStatus;
use App\Models\Manufacturer;
use App\Models\Order;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Order>
 */
class OrderFactory extends Factory
{
    protected $model = Order::class;

    public function definition(): array
    {
        return [
            'manufacturer_id' => Manufacturer::factory(),
            'sales_rep_id' => null,
            'public_token' => Str::random(48),
            'status' => OrderStatus::New,
            'customer_name' => fake()->name(),
            'customer_phone' => fake()->numerify('(##) #####-####'),
            'customer_email' => fake()->safeEmail(),
            'customer_notes' => null,
            'internal_notes' => null,
            'tracking_ref' => null,
        ];
    }

    public function forManufacturer(Manufacturer $manufacturer): static
    {
        return $this->state(fn () => [
            'manufacturer_id' => $manufacturer->id,
        ]);
    }

    public function status(OrderStatus $status): static
    {
        return $this->state(fn () => [
            'status' => $status,
        ]);
    }
}
