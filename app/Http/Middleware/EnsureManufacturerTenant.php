<?php

namespace App\Http\Middleware;

use App\Services\TenantManager;
use Closure;
use Illuminate\Http\Request;
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
            abort(403, 'Acesso exclusivo para usuários da fabricante.');
        }

        if (! $user->current_manufacturer_id) {
            abort(403, 'Nenhuma fabricante está vinculada a este acesso.');
        }

        $manufacturer = $user->currentManufacturer;

        if (! $manufacturer || ! $manufacturer->is_active) {
            abort(403, 'A conta desta fabricante não está ativa.');
        }

        // Verify active membership exists
        $membership = $user->manufacturers()
            ->wherePivot('manufacturer_id', $manufacturer->id)
            ->wherePivot('status', 'active')
            ->first();

        if (! $membership) {
            abort(403, 'Seu acesso à fabricante não está ativo.');
        }

        // Set tenant in TenantManager
        $this->tenantManager->set($manufacturer);

        return $next($request);
    }
}
