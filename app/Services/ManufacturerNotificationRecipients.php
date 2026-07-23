<?php

namespace App\Services;

use App\Enums\ManufacturerCapability;
use App\Models\Manufacturer;
use App\Models\User;
use Illuminate\Support\Collection;

class ManufacturerNotificationRecipients
{
    /**
     * @return Collection<int, User>
     */
    public function forCapability(Manufacturer $manufacturer, ManufacturerCapability $capability): Collection
    {
        return $manufacturer->users()
            ->wherePivot('status', 'active')
            ->whereNotNull('email_verified_at')
            ->get()
            ->filter(function (User $user) use ($capability): bool {
                if ($user->pivot->role === 'owner' || $user->pivot->capabilities === null) {
                    return true;
                }

                $capabilities = is_array($user->pivot->capabilities)
                    ? $user->pivot->capabilities
                    : json_decode((string) $user->pivot->capabilities, true);

                return is_array($capabilities)
                    && in_array($capability->value, $capabilities, true);
            })
            ->unique('id')
            ->values();
    }
}
