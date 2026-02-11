<?php

namespace App\Http\Middleware;

use App\Models\Manufacturer;
use App\Services\TenantManager;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ResolveManufacturerFromRoute
{
    public function __construct(protected TenantManager $tenantManager) {}

    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Resolve manufacturer from route parameter (slug)
        $manufacturer = $request->route('manufacturer');

        if ($manufacturer instanceof Manufacturer) {
            $this->tenantManager->set($manufacturer);
        }

        return $next($request);
    }
}
