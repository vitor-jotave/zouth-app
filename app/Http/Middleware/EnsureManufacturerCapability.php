<?php

namespace App\Http\Middleware;

use App\Enums\ManufacturerCapability;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureManufacturerCapability
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string $capability): Response
    {
        $requiredCapability = ManufacturerCapability::tryFrom($capability);
        $user = $request->user();

        if (! $requiredCapability || ! $user?->hasManufacturerCapability($requiredCapability)) {
            abort(403, 'Você não tem acesso a esta área da operação.');
        }

        return $next($request);
    }
}
