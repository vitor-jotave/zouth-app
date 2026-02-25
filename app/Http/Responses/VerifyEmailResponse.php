<?php

namespace App\Http\Responses;

use Illuminate\Support\Facades\Auth;
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

        // Manufacturer user (default)
        return redirect()->intended('/dashboard?verified=1');
    }
}
