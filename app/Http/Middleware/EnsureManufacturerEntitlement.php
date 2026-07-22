<?php

namespace App\Http\Middleware;

use App\Services\PlanLimitService;
use App\Services\TenantManager;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureManufacturerEntitlement
{
    public function __construct(
        private TenantManager $tenantManager,
        private PlanLimitService $planLimitService,
    ) {}

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->routeIs('manufacturer.billing.*', 'manufacturer.account-paused')) {
            return $next($request);
        }

        $manufacturer = $this->tenantManager->get();

        if (! $manufacturer) {
            abort(403);
        }

        if (! $this->planLimitService->hasOperationalAccess($manufacturer)) {
            return redirect()->route('manufacturer.account-paused');
        }

        return $next($request);
    }
}
