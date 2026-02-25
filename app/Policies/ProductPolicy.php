<?php

namespace App\Policies;

use App\Models\Product;
use App\Models\User;

class ProductPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isManufacturerUser()
            && $user->current_manufacturer_id !== null;
    }

    public function view(User $user, Product $product): bool
    {
        return $user->isManufacturerUser()
            && $user->current_manufacturer_id === $product->manufacturer_id;
    }

    public function create(User $user): bool
    {
        return $user->isManufacturerUser()
            && $user->current_manufacturer_id !== null;
    }

    public function update(User $user, Product $product): bool
    {
        return $user->isManufacturerUser()
            && $user->current_manufacturer_id === $product->manufacturer_id;
    }

    public function delete(User $user, Product $product): bool
    {
        return $user->isManufacturerUser()
            && $user->current_manufacturer_id === $product->manufacturer_id;
    }

    public function restore(User $user, Product $product): bool
    {
        return $user->isManufacturerUser()
            && $user->current_manufacturer_id === $product->manufacturer_id;
    }

    public function forceDelete(User $user, Product $product): bool
    {
        return $user->isManufacturerUser()
            && $user->current_manufacturer_id === $product->manufacturer_id;
    }
}
