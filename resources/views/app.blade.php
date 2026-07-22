@php
    $isLandingPage = data_get($page, 'component') === 'landing/index';
    $landingSeo = $isLandingPage ? data_get($page, 'props.seo', []) : [];
    $landingPageTitle = data_get($landingSeo, 'pageTitle');
@endphp
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        {{-- Inline style to set the HTML background color --}}
        <style>
            html {
                background-color: #ffffff;
            }
        </style>

        @inertiaHead

        @if (! $__inertiaSsrResponse)
            @if ($isLandingPage && $landingPageTitle)
                <title inertia>{{ $landingPageTitle }} - ZOUTH</title>
                <meta inertia="description" name="description" content="{{ data_get($landingSeo, 'description') }}">
                <meta inertia="robots" name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
                <meta inertia="og-title" property="og:title" content="{{ data_get($landingSeo, 'ogTitle') }}">
                <meta inertia="og-description" property="og:description" content="{{ data_get($landingSeo, 'ogDescription') }}">
                <meta inertia="og-image" property="og:image" content="{{ data_get($landingSeo, 'shareImageUrl') }}">
                <meta inertia="og-image-width" property="og:image:width" content="{{ data_get($landingSeo, 'shareImageWidth') }}">
                <meta inertia="og-image-height" property="og:image:height" content="{{ data_get($landingSeo, 'shareImageHeight') }}">
                <meta inertia="og-image-alt" property="og:image:alt" content="Coleção de moda infantil apresentada pela Zouth">
                <meta inertia="og-url" property="og:url" content="{{ data_get($landingSeo, 'canonicalUrl') }}">
                <meta inertia="og-type" property="og:type" content="website">
                <meta inertia="og-locale" property="og:locale" content="pt_BR">
                <meta inertia="og-site-name" property="og:site_name" content="ZOUTH">
                <meta inertia="twitter-card" name="twitter:card" content="summary_large_image">
                <meta inertia="twitter-title" name="twitter:title" content="{{ data_get($landingSeo, 'ogTitle') }}">
                <meta inertia="twitter-description" name="twitter:description" content="{{ data_get($landingSeo, 'ogDescription') }}">
                <meta inertia="twitter-image" name="twitter:image" content="{{ data_get($landingSeo, 'shareImageUrl') }}">
                <link inertia="canonical" rel="canonical" href="{{ data_get($landingSeo, 'canonicalUrl') }}">
                <link inertia="landing-hero-preload" rel="preload" as="image" href="/brand/zouth/landing/collection-in-motion.webp" type="image/webp">
                <link inertia="sora-preload" rel="preload" as="font" href="/brand/zouth/assets/sora-variable.ttf" type="font/ttf" crossorigin="anonymous">
                <link inertia="manrope-preload" rel="preload" as="font" href="/brand/zouth/assets/manrope-variable.ttf" type="font/ttf" crossorigin="anonymous">
                <script inertia="organization-schema" type="application/ld+json">{!! json_encode(data_get($landingSeo, 'structuredData'), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) !!}</script>
            @else
                <title inertia>ZOUTH</title>
            @endif
        @endif

        <meta name="theme-color" content="#ff4d3d">
        <meta name="apple-mobile-web-app-title" content="Zouth">

        <link rel="icon" href="/brand/zouth/favicon/favicon.ico" sizes="any">
        <link rel="icon" href="/brand/zouth/favicon/favicon.svg" type="image/svg+xml">
        <link rel="icon" href="/brand/zouth/favicon/favicon-96x96.png" type="image/png" sizes="96x96">
        <link rel="apple-touch-icon" href="/brand/zouth/favicon/apple-touch-icon.png" sizes="180x180">
        <link rel="manifest" href="/brand/zouth/favicon/site.webmanifest">

        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />

        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
