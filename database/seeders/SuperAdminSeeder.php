<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SuperAdminSeeder extends Seeder
{
    /**
     * Create the superadmin account.
     * Credentials are read from environment variables so this seeder is safe to run in production.
     *
     * Required env vars: SUPERADMIN_NAME, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD
     */
    public function run(): void
    {
        $email = env('SUPERADMIN_EMAIL');
        $password = env('SUPERADMIN_PASSWORD');
        $name = env('SUPERADMIN_NAME', 'Super Admin');

        if (! $email || ! $password) {
            $this->command->warn('Skipping SuperAdminSeeder: SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD env vars are required.');

            return;
        }

        User::updateOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'password' => Hash::make($password),
                'user_type' => 'superadmin',
                'current_manufacturer_id' => null,
                'email_verified_at' => now(),
            ]
        );

        $this->command->info("Superadmin '{$email}' seeded.");
    }
}
