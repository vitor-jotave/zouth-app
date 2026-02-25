<?php

namespace App\Policies;

use App\Models\Order;
use App\Models\User;

class OrderPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isManufacturerUser()
            && $user->current_manufacturer_id !== null;
    }

    public function view(User $user, Order $order): bool
    {
        return $user->isManufacturerUser()
            && $user->current_manufacturer_id === $order->manufacturer_id;
    }

    public function updateStatus(User $user, Order $order): bool
    {
        return $user->isManufacturerUser()
            && $user->current_manufacturer_id === $order->manufacturer_id;
    }
}
