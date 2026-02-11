<?php

namespace App\Http\Middleware;

use App\Services\TenantManager;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureManufacturerTenant
{
    public function __construct(protected TenantManager $tenantManager) {}

    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->isManufacturerUser()) {
            abort(403, 'Access denied. Manufacturer user only.');
        }

        if (! $user->current_manufacturer_id) {
            Auth::logout();
            abort(403, 'No manufacturer assigned. Please contact support.');
        }

        $manufacturer = $user->currentManufacturer;

        if (! $manufacturer || ! $manufacturer->is_active) {
            Auth::logout();
            abort(403, 'Your manufacturer account is not active.');
        }

        // Verify active membership exists
        $membership = $user->manufacturers()
            ->wherePivot('manufacturer_id', $manufacturer->id)
            ->wherePivot('status', 'active')
            ->first();

        if (! $membership) {
            Auth::logout();
            abort(403, 'Your membership is not active.');
        }

        // Set tenant in TenantManager
        $this->tenantManager->set($manufacturer);

        return $next($request);
    }
}
