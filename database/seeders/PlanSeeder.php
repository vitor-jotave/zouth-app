<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    /**
     * Seed the 3 default plans.
     */
    public function run(): void
    {
        Plan::factory()->basic()->create([
            'description' => 'Ideal para quem está começando. Inclui 7 dias grátis para testar.',
        ]);

        Plan::factory()->intermediate()->create([
            'description' => 'Para fabricantes em crescimento que precisam de mais recursos.',
        ]);

        Plan::factory()->premium()->create([
            'description' => 'Recursos ilimitados para fabricantes de grande porte.',
        ]);
    }
}
