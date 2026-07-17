<?php

use App\Models\Plan;
use Database\Seeders\PlanSeeder;

it('seeds the approved monthly commercial prices', function () {
    $this->seed(PlanSeeder::class);

    expect(Plan::query()->pluck('monthly_price_cents', 'name')->all())->toMatchArray([
        'Básico' => 14700,
        'Intermediário' => 39700,
        'Premium' => 89700,
    ]);
});
