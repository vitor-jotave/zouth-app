<?php

namespace App\Policies;

use App\Models\User;
use App\Models\WhatsappInstance;

class WhatsappInstancePolicy
{
    /**
     * Only manufacturer users whose current manufacturer owns the instance can access it.
     */
    public function view(User $user, WhatsappInstance $instance): bool
    {
        return $user->isManufacturerUser()
            && $user->current_manufacturer_id === $instance->manufacturer_id;
    }

    public function update(User $user, WhatsappInstance $instance): bool
    {
        return $this->view($user, $instance);
    }

    public function delete(User $user, WhatsappInstance $instance): bool
    {
        return $this->view($user, $instance);
    }

    /**
     * Any manufacturer user can create an instance for their current manufacturer.
     */
    public function create(User $user): bool
    {
        return $user->isManufacturerUser()
            && $user->current_manufacturer_id !== null;
    }
}
