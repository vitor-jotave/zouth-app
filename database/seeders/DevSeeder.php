<?php

namespace Database\Seeders;

use App\Models\Manufacturer;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DevSeeder extends Seeder
{
    /**
     * Seed dev/local data: test users and a sample manufacturer.
     * Never call this seeder in production.
     */
    public function run(): void
    {
        // Superadmin
        User::firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Super Admin',
                'password' => Hash::make('password'),
                'user_type' => 'superadmin',
                'email_verified_at' => now(),
            ]
        );

        // Sample manufacturer
        $manufacturer = Manufacturer::firstOrCreate(
            ['slug' => 'acme-corporation'],
            [
                'name' => 'Acme Corporation',
                'is_active' => true,
            ]
        );

        // Manufacturer owner
        $owner = User::firstOrCreate(
            ['email' => 'owner@acme.com'],
            [
                'name' => 'John Doe',
                'password' => Hash::make('password'),
                'user_type' => 'manufacturer_user',
                'current_manufacturer_id' => $manufacturer->id,
                'email_verified_at' => now(),
            ]
        );

        if (! $manufacturer->users()->where('user_id', $owner->id)->exists()) {
            $manufacturer->users()->attach($owner->id, ['role' => 'owner', 'status' => 'active']);
        }

        // Manufacturer staff
        $staff = User::firstOrCreate(
            ['email' => 'staff@acme.com'],
            [
                'name' => 'Jane Smith',
                'password' => Hash::make('password'),
                'user_type' => 'manufacturer_user',
                'current_manufacturer_id' => $manufacturer->id,
                'email_verified_at' => now(),
            ]
        );

        if (! $manufacturer->users()->where('user_id', $staff->id)->exists()) {
            $manufacturer->users()->attach($staff->id, ['role' => 'staff', 'status' => 'active']);
        }

        // Sales rep
        User::firstOrCreate(
            ['email' => 'rep@example.com'],
            [
                'name' => 'Sales Rep',
                'password' => Hash::make('password'),
                'user_type' => 'sales_rep',
                'email_verified_at' => now(),
            ]
        );

        $this->command->info('Dev data seeded. Logins: admin@example.com, owner@acme.com, staff@acme.com, rep@example.com (all password: password)');
    }
}
