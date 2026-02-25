<?php

namespace App\Policies;

use App\Models\ManufacturerAffiliation;
use App\Models\User;

class ManufacturerAffiliationPolicy
{
    /**
     * Determine whether the user can view any affiliations.
     * Only manufacturer users can manage affiliations.
     */
    public function viewAny(User $user): bool
    {
        return $user->isManufacturerUser()
            && $user->current_manufacturer_id !== null;
    }

    /**
     * Determine whether the user can approve the affiliation.
     */
    public function approve(User $user, ManufacturerAffiliation $affiliation): bool
    {
        return $user->isManufacturerUser()
            && $user->current_manufacturer_id === $affiliation->manufacturer_id;
    }

    /**
     * Determine whether the user can reject the affiliation.
     */
    public function reject(User $user, ManufacturerAffiliation $affiliation): bool
    {
        return $user->isManufacturerUser()
            && $user->current_manufacturer_id === $affiliation->manufacturer_id;
    }

    /**
     * Determine whether the user can revoke the affiliation.
     */
    public function revoke(User $user, ManufacturerAffiliation $affiliation): bool
    {
        return $user->isManufacturerUser()
            && $user->current_manufacturer_id === $affiliation->manufacturer_id;
    }
}
