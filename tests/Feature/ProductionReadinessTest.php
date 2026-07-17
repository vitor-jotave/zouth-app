<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

it('exposes liveness and readiness endpoints', function () {
    $this->get('/up')->assertSuccessful();
    $this->get('/health/live')
        ->assertSuccessful()
        ->assertJson(['status' => 'ok']);
    $this->get('/health/ready')
        ->assertSuccessful()
        ->assertJson([
            'status' => 'ok',
            'checks' => ['database' => true, 'cache' => true],
        ]);
});

it('trusts forwarded https headers from configured production proxies', function () {
    config([
        'app.trusted_hosts' => ['^zouth\\.app$'],
        'trustedproxy.proxies' => '*',
    ]);

    Route::get('/_tests/trusted-proxy', fn (Request $request) => [
        'host' => $request->getHost(),
        'secure' => $request->isSecure(),
    ]);

    $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.10'])
        ->withHeaders([
            'Host' => 'zouth.app',
            'X-Forwarded-Host' => 'zouth.app',
            'X-Forwarded-Proto' => 'https',
        ])
        ->get('/_tests/trusted-proxy')
        ->assertSuccessful()
        ->assertJson([
            'host' => 'zouth.app',
            'secure' => true,
        ]);
});

it('rejects requests for hosts outside the configured production hosts', function () {
    $originalEnvironment = app()->environment();

    try {
        app()->detectEnvironment(fn (): string => 'production');

        config([
            'app.trusted_hosts' => ['^zouth\\.app$'],
            'trustedproxy.proxies' => '*',
        ]);

        Route::get('/_tests/trusted-host', fn () => response()->noContent());

        $this->withHeader('Host', 'attacker.example')
            ->get('/_tests/trusted-host')
            ->assertStatus(400);
    } finally {
        Request::setTrustedHosts([]);
        app()->detectEnvironment(fn (): string => $originalEnvironment);
    }
});
