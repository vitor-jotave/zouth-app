<?php

namespace Database\Seeders;

use App\Models\Manufacturer;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create superadmin
        $superadmin = User::create([
            'name' => 'Super Admin',
            'email' => 'admin@example.com',
            'password' => Hash::make('password'),
            'user_type' => 'superadmin',
            'current_manufacturer_id' => null,
        ]);

        // Create manufacturer with owner
        $manufacturer = Manufacturer::create([
            'name' => 'Acme Corporation',
            'slug' => 'acme-corporation',
            'is_active' => true,
        ]);

        $owner = User::create([
            'name' => 'John Doe',
            'email' => 'owner@acme.com',
            'password' => Hash::make('password'),
            'user_type' => 'manufacturer_user',
            'current_manufacturer_id' => $manufacturer->id,
        ]);

        // Attach owner to manufacturer
        $manufacturer->users()->attach($owner->id, [
            'role' => 'owner',
            'status' => 'active',
        ]);

        // Create a staff member
        $staff = User::create([
            'name' => 'Jane Smith',
            'email' => 'staff@acme.com',
            'password' => Hash::make('password'),
            'user_type' => 'manufacturer_user',
            'current_manufacturer_id' => $manufacturer->id,
        ]);

        $manufacturer->users()->attach($staff->id, [
            'role' => 'staff',
            'status' => 'active',
        ]);

        // Create sales rep
        $salesRep = User::create([
            'name' => 'Sales Rep',
            'email' => 'rep@example.com',
            'password' => Hash::make('password'),
            'user_type' => 'sales_rep',
            'current_manufacturer_id' => null,
        ]);
    }
}
