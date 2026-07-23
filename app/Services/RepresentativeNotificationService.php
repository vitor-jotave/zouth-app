<?php

namespace App\Services;

use App\Enums\ManufacturerCapability;
use App\Models\ManufacturerAffiliation;
use App\Notifications\RepresentativeApplicationReceivedNotification;
use App\Notifications\RepresentativeApplicationStatusNotification;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Throwable;

class RepresentativeNotificationService
{
    public function __construct(private ManufacturerNotificationRecipients $recipients) {}

    public function notifyApplicationReceived(ManufacturerAffiliation $affiliation): void
    {
        $affiliation->loadMissing('manufacturer');
        $manufacturerRecipients = $this->recipients->forCapability(
            $affiliation->manufacturer,
            ManufacturerCapability::Affiliations,
        );

        if ($manufacturerRecipients->isNotEmpty()) {
            $this->safely(
                $affiliation,
                'manufacturer_application_received',
                fn () => Notification::send(
                    $manufacturerRecipients,
                    new RepresentativeApplicationReceivedNotification($affiliation),
                ),
            );
        }
    }

    public function notifyStatusChanged(ManufacturerAffiliation $affiliation): void
    {
        $affiliation->loadMissing('user');

        if ($affiliation->user->hasVerifiedEmail()) {
            $this->safely(
                $affiliation,
                'representative_application_status',
                fn () => $affiliation->user->notify(
                    new RepresentativeApplicationStatusNotification($affiliation),
                ),
            );
        }
    }

    private function safely(ManufacturerAffiliation $affiliation, string $notification, callable $send): void
    {
        try {
            $send();
        } catch (Throwable $exception) {
            Log::error('Could not queue representative notification.', [
                'manufacturer_affiliation_id' => $affiliation->id,
                'notification' => $notification,
                'exception' => $exception,
            ]);
        }
    }
}
