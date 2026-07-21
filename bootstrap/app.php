<?php

use App\Http\Middleware\AddSecurityHeaders;
use App\Http\Middleware\EnsureManufacturerCapability;
use App\Http\Middleware\EnsureManufacturerOwner;
use App\Http\Middleware\EnsureManufacturerTenant;
use App\Http\Middleware\EnsureSalesRep;
use App\Http\Middleware\EnsureSuperadmin;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\ResolveManufacturerFromRoute;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['sidebar_state']);

        $middleware->validateCsrfTokens(except: [
            'stripe/*',
            'webhooks/evolution/*',
        ]);

        $middleware->trustHosts(
            at: fn (): array => config('app.trusted_hosts'),
            subdomains: false,
        );

        $middleware->trustProxies(
            headers: Request::HEADER_X_FORWARDED_FOR |
                     Request::HEADER_X_FORWARDED_HOST |
                     Request::HEADER_X_FORWARDED_PORT |
                     Request::HEADER_X_FORWARDED_PROTO |
                     Request::HEADER_X_FORWARDED_AWS_ELB
        );

        $middleware->web(append: [
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            AddSecurityHeaders::class,
        ]);

        $middleware->alias([
            'superadmin' => EnsureSuperadmin::class,
            'manufacturer.tenant' => EnsureManufacturerTenant::class,
            'manufacturer.capability' => EnsureManufacturerCapability::class,
            'manufacturer.owner' => EnsureManufacturerOwner::class,
            'sales.rep' => EnsureSalesRep::class,
            'resolve.manufacturer' => ResolveManufacturerFromRoute::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
