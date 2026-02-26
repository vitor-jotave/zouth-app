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
        $plans = [
            [
                'name' => 'Básico',
                'description' => 'Ideal para quem está começando. Inclui 7 dias grátis para testar.',
                'monthly_price_cents' => 4990,
                'trial_days' => 7,
                'sort_order' => 1,
                'max_reps' => 5,
                'max_products' => 50,
                'max_orders_per_month' => 60,
                'max_users' => 3,
                'max_data_mb' => 500,
                'max_files_gb' => 1,
                'allow_csv_import' => false,
            ],
            [
                'name' => 'Intermediário',
                'description' => 'Para fabricantes em crescimento que precisam de mais recursos.',
                'monthly_price_cents' => 9990,
                'trial_days' => 0,
                'sort_order' => 2,
                'max_reps' => 90,
                'max_products' => 500,
                'max_orders_per_month' => 500,
                'max_users' => 10,
                'max_data_mb' => 2000,
                'max_files_gb' => 5,
                'allow_csv_import' => true,
            ],
            [
                'name' => 'Premium',
                'description' => 'Recursos ilimitados para fabricantes de grande porte.',
                'monthly_price_cents' => 19990,
                'trial_days' => 0,
                'sort_order' => 3,
                'max_reps' => null,
                'max_products' => null,
                'max_orders_per_month' => null,
                'max_users' => null,
                'max_data_mb' => null,
                'max_files_gb' => null,
                'allow_csv_import' => true,
            ],
        ];

        foreach ($plans as $data) {
            Plan::updateOrCreate(
                ['name' => $data['name']],
                array_merge($data, ['is_active' => true, 'currency' => 'BRL'])
            );
        }
    }
}
