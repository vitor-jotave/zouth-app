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
            $imageSources = $this->imageSources();

            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
            $response->headers->set(
                'Content-Security-Policy',
                "default-src 'self'; "
                ."script-src 'self' 'nonce-{$nonce}' https://js.stripe.com; "
                ."style-src 'self' 'unsafe-inline'; "
                ."img-src {$imageSources}; "
                ."font-src 'self' data:; "
                ."connect-src 'self' https://api.stripe.com; "
                .'frame-src https://js.stripe.com https://hooks.stripe.com; '
                ."object-src 'none'; "
                ."base-uri 'self'"
            );
        }

        return $response;
    }

    private function imageSources(): string
    {
        $sources = ["'self'", 'data:', 'blob:'];
        $s3Url = config('filesystems.disks.s3.url');

        if (is_string($s3Url) && $s3Url !== '') {
            $origin = $this->originFromUrl($s3Url);

            if ($origin !== null) {
                $sources[] = $origin;
            }
        }

        return implode(' ', array_unique($sources));
    }

    private function originFromUrl(string $url): ?string
    {
        $parts = parse_url($url);

        if (! isset($parts['scheme'], $parts['host'])) {
            return null;
        }

        $origin = $parts['scheme'].'://'.$parts['host'];

        if (isset($parts['port'])) {
            $origin .= ':'.$parts['port'];
        }

        return $origin;
    }
}
