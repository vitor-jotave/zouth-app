<?php

namespace App\Policies;

use App\Models\User;
use App\Models\VariationType;

class VariationTypePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isManufacturerUser()
            && $user->current_manufacturer_id !== null;
    }

    public function view(User $user, VariationType $variationType): bool
    {
        return $user->isManufacturerUser()
            && $user->current_manufacturer_id === $variationType->manufacturer_id;
    }

    public function create(User $user): bool
    {
        return $user->isManufacturerUser()
            && $user->current_manufacturer_id !== null;
    }

    public function update(User $user, VariationType $variationType): bool
    {
        return $user->isManufacturerUser()
            && $user->current_manufacturer_id === $variationType->manufacturer_id;
    }

    public function delete(User $user, VariationType $variationType): bool
    {
        return $user->isManufacturerUser()
            && $user->current_manufacturer_id === $variationType->manufacturer_id;
    }

    public function restore(User $user, VariationType $variationType): bool
    {
        return $user->isManufacturerUser()
            && $user->current_manufacturer_id === $variationType->manufacturer_id;
    }

    public function forceDelete(User $user, VariationType $variationType): bool
    {
        return $user->isManufacturerUser()
            && $user->current_manufacturer_id === $variationType->manufacturer_id;
    }
}
