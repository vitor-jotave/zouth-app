<?php

namespace App\Policies;

use App\Models\Customer;
use App\Models\User;

class CustomerPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isManufacturerUser()
            && $user->current_manufacturer_id !== null;
    }

    public function view(User $user, Customer $customer): bool
    {
        return $user->isManufacturerUser()
            && $user->current_manufacturer_id === $customer->manufacturer_id;
    }

    public function create(User $user): bool
    {
        return $user->isManufacturerUser()
            && $user->current_manufacturer_id !== null;
    }

    public function update(User $user, Customer $customer): bool
    {
        return $user->isManufacturerUser()
            && $user->current_manufacturer_id === $customer->manufacturer_id;
    }

    public function delete(User $user, Customer $customer): bool
    {
        return false;
    }

    public function restore(User $user, Customer $customer): bool
    {
        return false;
    }

    public function forceDelete(User $user, Customer $customer): bool
    {
        return false;
    }
}
