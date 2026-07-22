<?php

namespace App\Http\Responses;

use App\Notifications\TrialWelcomeNotification;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Laravel\Fortify\Contracts\VerifyEmailResponse as VerifyEmailResponseContract;

class VerifyEmailResponse implements VerifyEmailResponseContract
{
    /**
     * Create an HTTP response that represents the object.
     *
     * Redirects the user to the correct dashboard based on their user type
     * after email verification. A ?verified=1 query string is appended so
     * the frontend can show a confirmation message.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function toResponse($request)
    {
        if ($request->wantsJson()) {
            return response()->noContent();
        }

        $user = Auth::user();

        if ($user?->isSuperadmin()) {
            return redirect()->intended('/admin/dashboard?verified=1');
        }

        if ($user?->isSalesRep()) {
            return redirect()->intended('/rep/dashboard?verified=1');
        }

        if ($user?->isManufacturerUser() && $user->currentManufacturer) {
            $manufacturer = $user->currentManufacturer;
            $shouldSendWelcome = $manufacturer->welcome_sent_at === null;

            DB::transaction(function () use ($manufacturer, $shouldSendWelcome): void {
                $manufacturer->update([
                    'onboarding_email_confirmed_at' => $manufacturer->onboarding_email_confirmed_at ?? now(),
                    'welcome_sent_at' => $shouldSendWelcome ? now() : $manufacturer->welcome_sent_at,
                ]);

                $manufacturer->onboardingSessions()->update([
                    'current_step' => 5,
                    'email_confirmed_at' => now(),
                    'last_activity_at' => now(),
                ]);
            });

            if ($shouldSendWelcome) {
                $user->notify(new TrialWelcomeNotification($manufacturer));
            }

            if ($manufacturer->onboarding_completed_at === null) {
                return redirect()->route('onboarding.index', ['verified' => 1]);
            }
        }

        return redirect()->intended('/dashboard?verified=1');
    }
}
