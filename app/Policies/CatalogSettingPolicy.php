<?php

namespace App\Policies;

use App\Models\CatalogSetting;
use App\Models\User;

class CatalogSettingPolicy
{
    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, CatalogSetting $catalogSetting): bool
    {
        return $user->isManufacturerUser()
            && $user->current_manufacturer_id === $catalogSetting->manufacturer_id;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, CatalogSetting $catalogSetting): bool
    {
        return $user->isManufacturerUser()
            && $user->current_manufacturer_id === $catalogSetting->manufacturer_id;
    }
}
