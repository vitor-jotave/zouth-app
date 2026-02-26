<?php

namespace App\Policies;

use App\Models\User;
use App\Models\WhatsappConversation;

class WhatsappConversationPolicy
{
    /**
     * The user can view a conversation if they own the related instance's manufacturer.
     */
    public function view(User $user, WhatsappConversation $conversation): bool
    {
        return $user->isManufacturerUser()
            && $user->current_manufacturer_id === $conversation->instance->manufacturer_id;
    }

    public function sendMessage(User $user, WhatsappConversation $conversation): bool
    {
        return $this->view($user, $conversation);
    }
}
