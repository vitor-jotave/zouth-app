<?php

namespace Database\Factories;

use App\Models\Manufacturer;
use App\Models\ProductImportMapping;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProductImportMapping>
 */
class ProductImportMappingFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $headers = ['Código', 'Produto', 'Saldo'];

        return [
            'manufacturer_id' => Manufacturer::factory(),
            'user_id' => User::factory(),
            'name' => 'Formato do ERP',
            'header_signature' => hash('sha256', json_encode($headers)),
            'headers' => $headers,
            'mapping' => ['sku' => 'Código', 'name' => 'Produto', 'stock' => 'Saldo'],
            'last_used_at' => now(),
        ];
    }
}
