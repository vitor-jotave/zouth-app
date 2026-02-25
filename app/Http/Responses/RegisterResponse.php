<?php

namespace App\Http\Responses;

use Illuminate\Support\Facades\Auth;
use Laravel\Fortify\Contracts\RegisterResponse as RegisterResponseContract;

class RegisterResponse implements RegisterResponseContract
{
    /**
     * Create an HTTP response that represents the object.
     *
     * Self-registrations are always sales representatives, so redirect to
     * the rep dashboard. The verified middleware will then handle the email
     * verification flow from there.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function toResponse($request)
    {
        if ($request->wantsJson()) {
            return response()->json(['two_factor' => false], 201);
        }

        $user = Auth::user();

        if ($user?->isSalesRep()) {
            return redirect()->intended('/rep/dashboard');
        }

        return redirect()->intended('/dashboard');
    }
}
