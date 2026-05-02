<?php

namespace Database\Factories;

use App\Enums\OrderStatus;
use App\Models\Customer;
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
            'customer_id' => null,
            'sales_rep_id' => null,
            'public_token' => Str::random(48),
            'status' => OrderStatus::New,
            'customer_name' => fake()->name(),
            'customer_phone' => fake()->numerify('(##) #####-####'),
            'customer_email' => fake()->safeEmail(),
            'customer_document_type' => 'cpf',
            'customer_document' => '52998224725',
            'customer_notes' => null,
            'customer_zip_code' => fake()->numerify('########'),
            'customer_state' => fake()->randomElement(['SP', 'RJ', 'MG', 'PR', 'SC']),
            'customer_city' => fake()->city(),
            'customer_neighborhood' => fake()->streetName(),
            'customer_street' => fake()->streetName(),
            'customer_address_number' => fake()->buildingNumber(),
            'customer_address_complement' => null,
            'customer_address_reference' => null,
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

    public function forCustomer(Customer $customer): static
    {
        return $this->state(fn () => [
            'customer_id' => $customer->id,
            'manufacturer_id' => $customer->manufacturer_id,
            'customer_name' => $customer->name,
            'customer_phone' => $customer->phone,
            'customer_email' => $customer->email,
            'customer_document_type' => $customer->customer_document_type,
            'customer_document' => $customer->customer_document,
            'customer_zip_code' => $customer->zip_code,
            'customer_state' => $customer->state,
            'customer_city' => $customer->city,
            'customer_neighborhood' => $customer->neighborhood,
            'customer_street' => $customer->street,
            'customer_address_number' => $customer->address_number,
            'customer_address_complement' => $customer->address_complement,
            'customer_address_reference' => $customer->address_reference,
        ]);
    }
}
