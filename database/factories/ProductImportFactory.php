<?php

namespace Database\Factories;

use App\Enums\ProductImportStatus;
use App\Models\Manufacturer;
use App\Models\ProductImport;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProductImport>
 */
class ProductImportFactory extends Factory
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
            'user_id' => User::factory(),
            'status' => ProductImportStatus::Uploaded,
            'source_name' => 'colecao.xlsx',
            'source_path' => 'product-imports/source/colecao.xlsx',
            'source_extension' => 'xlsx',
            'headers' => ['SKU', 'Nome', 'Estoque'],
            'progress' => 0,
            'expires_at' => now()->addDays(30),
        ];
    }

    public function ready(): static
    {
        return $this->state(fn (): array => [
            'status' => ProductImportStatus::Ready,
            'mapping' => ['sku' => 'SKU', 'name' => 'Nome', 'stock' => 'Estoque'],
            'summary' => ['products' => 1, 'create' => 1, 'update' => 0, 'errors' => 0],
            'preview_signature' => hash('sha256', 'preview'),
            'progress' => 35,
            'validated_at' => now(),
        ]);
    }
}
