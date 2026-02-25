<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Vite;
use Symfony\Component\HttpFoundation\Response;

class AddSecurityHeaders
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        Vite::useCspNonce();

        $response = $next($request);

        $nonce = Vite::cspNonce();

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

        if (app()->environment('production')) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
            $response->headers->set(
                'Content-Security-Policy',
                "default-src 'self'; "
                ."script-src 'self' 'nonce-{$nonce}' https://js.stripe.com; "
                ."style-src 'self' 'unsafe-inline'; "
                ."img-src 'self' data: blob:; "
                ."font-src 'self' data:; "
                ."connect-src 'self' https://api.stripe.com; "
                .'frame-src https://js.stripe.com https://hooks.stripe.com; '
                ."object-src 'none'; "
                ."base-uri 'self'"
            );
        }

        return $response;
    }
}
