<?php

namespace App\Policies;

use App\Models\Manufacturer;
use App\Models\User;

class ManufacturerPolicy
{
    /**
     * Determine whether the user can view any manufacturers (admin only).
     */
    public function viewAny(User $user): bool
    {
        return $user->isSuperadmin();
    }

    /**
     * Determine whether the user can view the manufacturer.
     */
    public function view(User $user, Manufacturer $manufacturer): bool
    {
        // Superadmin can view all
        if ($user->isSuperadmin()) {
            return true;
        }

        // Manufacturer users can view their own
        if ($user->isManufacturerUser() && $user->current_manufacturer_id === $manufacturer->id) {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can create manufacturers (superadmin only).
     */
    public function create(User $user): bool
    {
        return $user->isSuperadmin();
    }

    /**
     * Determine whether the user can update the manufacturer.
     */
    public function update(User $user, Manufacturer $manufacturer): bool
    {
        // Superadmin can update any
        if ($user->isSuperadmin()) {
            return true;
        }

        // Owner can update their own manufacturer
        if ($user->isManufacturerUser() && $user->current_manufacturer_id === $manufacturer->id) {
            $membership = $user->manufacturers()
                ->wherePivot('manufacturer_id', $manufacturer->id)
                ->wherePivot('role', 'owner')
                ->wherePivot('status', 'active')
                ->first();

            return $membership !== null;
        }

        return false;
    }

    /**
     * Determine whether the user can delete the manufacturer (superadmin only).
     */
    public function delete(User $user, Manufacturer $manufacturer): bool
    {
        return $user->isSuperadmin();
    }

    /**
     * Determine whether the user can toggle active status (superadmin only).
     */
    public function toggleActive(User $user, Manufacturer $manufacturer): bool
    {
        return $user->isSuperadmin();
    }

    /**
     * Determine whether the user can manage team members.
     */
    public function manageTeam(User $user, Manufacturer $manufacturer): bool
    {
        if ($user->isManufacturerUser() && $user->current_manufacturer_id === $manufacturer->id) {
            $membership = $user->manufacturers()
                ->wherePivot('manufacturer_id', $manufacturer->id)
                ->wherePivot('role', 'owner')
                ->wherePivot('status', 'active')
                ->first();

            return $membership !== null;
        }

        return false;
    }
}
