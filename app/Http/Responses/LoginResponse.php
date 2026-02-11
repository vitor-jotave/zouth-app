<?php

namespace App\Http\Responses;

use Illuminate\Support\Facades\Auth;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;

class LoginResponse implements LoginResponseContract
{
    /**
     * Create an HTTP response that represents the object.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function toResponse($request)
    {
        $user = Auth::user();

        // Superadmin logic
        if ($user->isSuperadmin()) {
            // Ensure no manufacturer is set
            if ($user->current_manufacturer_id !== null) {
                $user->update(['current_manufacturer_id' => null]);
            }

            return redirect()->intended('/admin/dashboard');
        }

        // Manufacturer user logic
        if ($user->isManufacturerUser()) {
            // Find eligible manufacturers (active membership + active manufacturer)
            $eligibleManufacturers = $user->manufacturers()
                ->wherePivot('status', 'active')
                ->where('is_active', true)
                ->get();

            if ($eligibleManufacturers->count() !== 1) {
                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                return redirect()->route('login')->withErrors([
                    'email' => 'Your account is not properly configured. Please contact support.',
                ]);
            }

            $manufacturer = $eligibleManufacturers->first();

            // Set current manufacturer
            $user->update(['current_manufacturer_id' => $manufacturer->id]);

            return redirect()->intended('/dashboard');
        }

        // Sales rep logic
        if ($user->isSalesRep()) {
            // Ensure no manufacturer is set
            if ($user->current_manufacturer_id !== null) {
                $user->update(['current_manufacturer_id' => null]);
            }

            return redirect()->intended('/rep/dashboard');
        }

        // Fallback - should not happen
        Auth::logout();

        return redirect()->route('login')->withErrors([
            'email' => 'Invalid user type.',
        ]);
    }
}
