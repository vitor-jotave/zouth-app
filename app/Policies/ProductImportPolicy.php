<?php

namespace App\Policies;

use App\Enums\ManufacturerCapability;
use App\Models\ProductImport;
use App\Models\User;

class ProductImportPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->isManufacturerUser()
            && $user->current_manufacturer_id !== null
            && $user->hasManufacturerCapability(ManufacturerCapability::Collection);
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, ProductImport $productImport): bool
    {
        return $this->belongsToCurrentManufacturer($user, $productImport);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $this->viewAny($user);
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, ProductImport $productImport): bool
    {
        return $this->belongsToCurrentManufacturer($user, $productImport);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, ProductImport $productImport): bool
    {
        return $this->belongsToCurrentManufacturer($user, $productImport);
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, ProductImport $productImport): bool
    {
        return $this->belongsToCurrentManufacturer($user, $productImport);
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, ProductImport $productImport): bool
    {
        return false;
    }

    private function belongsToCurrentManufacturer(User $user, ProductImport $productImport): bool
    {
        return $user->isManufacturerUser()
            && $user->current_manufacturer_id === $productImport->manufacturer_id
            && $user->hasManufacturerCapability(ManufacturerCapability::Collection);
    }
}
