<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Production seeders — safe to run on a live database.
     * To also seed local dev data run: php artisan db:seed --class=DevSeeder
     */
    public function run(): void
    {
        $this->call([
            PlanSeeder::class,
            SuperAdminSeeder::class,
        ]);
    }
}
