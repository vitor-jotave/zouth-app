<?php

namespace App\Policies;

use App\Enums\ManufacturerCapability;
use App\Models\OrderRule;
use App\Models\User;

class OrderRulePolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->isManufacturerUser()
            && $user->current_manufacturer_id !== null
            && $user->hasManufacturerCapability(ManufacturerCapability::Orders);
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, OrderRule $orderRule): bool
    {
        return $this->belongsToCurrentManufacturer($user, $orderRule);
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
    public function update(User $user, OrderRule $orderRule): bool
    {
        return $this->belongsToCurrentManufacturer($user, $orderRule);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, OrderRule $orderRule): bool
    {
        return $this->belongsToCurrentManufacturer($user, $orderRule);
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, OrderRule $orderRule): bool
    {
        return $this->belongsToCurrentManufacturer($user, $orderRule);
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, OrderRule $orderRule): bool
    {
        return false;
    }

    private function belongsToCurrentManufacturer(User $user, OrderRule $orderRule): bool
    {
        return $user->isManufacturerUser()
            && $user->current_manufacturer_id === $orderRule->manufacturer_id
            && $user->hasManufacturerCapability(ManufacturerCapability::Orders);
    }
}
