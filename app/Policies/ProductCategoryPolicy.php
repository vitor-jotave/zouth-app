<?php

namespace App\Policies;

use App\Models\ProductCategory;
use App\Models\User;

class ProductCategoryPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->current_manufacturer_id !== null;
    }

    public function view(User $user, ProductCategory $productCategory): bool
    {
        return $user->current_manufacturer_id === $productCategory->manufacturer_id;
    }

    public function create(User $user): bool
    {
        return $user->current_manufacturer_id !== null;
    }

    public function update(User $user, ProductCategory $productCategory): bool
    {
        return $user->current_manufacturer_id === $productCategory->manufacturer_id;
    }

    public function delete(User $user, ProductCategory $productCategory): bool
    {
        return $user->current_manufacturer_id === $productCategory->manufacturer_id;
    }

    public function restore(User $user, ProductCategory $productCategory): bool
    {
        return $user->current_manufacturer_id === $productCategory->manufacturer_id;
    }

    public function forceDelete(User $user, ProductCategory $productCategory): bool
    {
        return $user->current_manufacturer_id === $productCategory->manufacturer_id;
    }
}
