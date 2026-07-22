<?php

namespace Database\Factories;

use App\Models\ProductImport;
use App\Models\ProductImportRow;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProductImportRow>
 */
class ProductImportRowFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'product_import_id' => ProductImport::factory(),
            'row_number' => fake()->unique()->numberBetween(2, 1000),
            'product_sku' => fake()->unique()->bothify('SKU-####'),
            'action' => 'create',
            'source' => ['SKU' => 'SKU-001', 'Nome' => 'Macacão'],
            'normalized' => [
                'sku' => 'SKU-001',
                'name' => 'Macacão',
                'stock' => 10,
            ],
        ];
    }
}
