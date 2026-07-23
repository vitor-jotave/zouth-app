<?php

namespace App\Services;

use App\Enums\ManufacturerCapability;
use App\Enums\OrderStatus;
use App\Models\Order;
use App\Notifications\NewOrderNotification;
use App\Notifications\OrderAttributedToRepresentativeNotification;
use App\Notifications\OrderReceivedNotification;
use App\Notifications\OrderStatusUpdatedNotification;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Throwable;

class OrderNotificationService
{
    public function __construct(private ManufacturerNotificationRecipients $recipients) {}

    public function notifyCreated(Order $order): void
    {
        $order->loadMissing(['manufacturer', 'items', 'salesRep']);
        $manufacturerRecipients = $this->recipients->forCapability(
            $order->manufacturer,
            ManufacturerCapability::Orders,
        );

        if ($manufacturerRecipients->isNotEmpty()) {
            $this->safely(
                $order,
                'manufacturer_new_order',
                fn () => Notification::send($manufacturerRecipients, new NewOrderNotification($order)),
            );
        }

        if ($order->customer_email) {
            $this->safely(
                $order,
                'customer_order_received',
                fn () => Notification::route('mail', [$order->customer_email => $order->customer_name])
                    ->notify(new OrderReceivedNotification($order)),
            );
        }

        if ($order->salesRep?->email && $order->salesRep->hasVerifiedEmail()) {
            $this->safely(
                $order,
                'representative_attributed_order',
                fn () => $order->salesRep->notify(new OrderAttributedToRepresentativeNotification($order)),
            );
        }
    }

    public function notifyStatusChanged(Order $order, OrderStatus $previousStatus): void
    {
        if (! $order->customer_email || $order->status === $previousStatus) {
            return;
        }

        $order->loadMissing(['manufacturer', 'items']);

        $this->safely(
            $order,
            'customer_order_status_updated',
            fn () => Notification::route('mail', [$order->customer_email => $order->customer_name])
                ->notify(new OrderStatusUpdatedNotification($order, $previousStatus)),
        );
    }

    private function safely(Order $order, string $notification, callable $send): void
    {
        try {
            $send();
        } catch (Throwable $exception) {
            Log::error('Could not queue commercial order notification.', [
                'order_id' => $order->id,
                'notification' => $notification,
                'exception' => $exception,
            ]);
        }
    }
}
