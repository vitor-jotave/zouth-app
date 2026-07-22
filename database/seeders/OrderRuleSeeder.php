<?php

namespace Database\Seeders;

use App\Models\Manufacturer;
use Illuminate\Database\Seeder;

class OrderRuleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Manufacturer::query()->each(function (Manufacturer $manufacturer): void {
            $manufacturer->orderRules()->firstOrCreate([
                'manufacturer_id' => $manufacturer->id,
                'name' => 'Pedido mínimo',
            ], [
                'description' => 'O ponto de entrada comercial deste catálogo.',
                'is_active' => true,
                'match_mode' => 'all',
                'conditions' => [[
                    'metric' => 'subtotal_cents',
                    'operator' => 'lte',
                    'value' => 149999,
                    'max_value' => null,
                    'scope_type' => null,
                    'scope_ids' => [],
                ]],
                'action' => ['type' => 'block_checkout', 'value' => null],
                'public_message' => 'O pedido mínimo é de R$ 1.500.',
                'sort_order' => 0,
            ]);
        });
    }
}
