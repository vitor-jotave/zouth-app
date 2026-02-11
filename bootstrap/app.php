<?php

use App\Http\Middleware\EnsureManufacturerTenant;
use App\Http\Middleware\EnsureSalesRep;
use App\Http\Middleware\EnsureSuperadmin;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\ResolveManufacturerFromRoute;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'superadmin' => EnsureSuperadmin::class,
            'manufacturer.tenant' => EnsureManufacturerTenant::class,
            'sales.rep' => EnsureSalesRep::class,
            'resolve.manufacturer' => ResolveManufacturerFromRoute::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
