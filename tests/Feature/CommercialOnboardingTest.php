<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('landing page exposes configured commercial links', function () {
    $this->withoutVite();

    config()->set('commercial.sales_contact_url', 'https://example.com/contact');
    config()->set('commercial.demo_catalog_url', 'https://example.com/demo');

    $this->get(route('home'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('landing/index')
            ->where('commercial.salesContactUrl', 'https://example.com/contact')
            ->where('commercial.demoCatalogUrl', 'https://example.com/demo')
            ->where('seo.pageTitle', config('commercial.seo.home_title'))
            ->where('seo.description', config('commercial.seo.home_description'))
            ->where('seo.canonicalUrl', url('/'))
            ->where('seo.shareImageUrl', url('/brand/zouth/landing/collection-in-motion.webp'))
            ->where('seo.shareImageWidth', 1536)
            ->where('seo.shareImageHeight', 1024)
            ->where('seo.ogTitle', config('commercial.seo.home_og_title'))
            ->where('seo.ogDescription', config('commercial.seo.home_og_description'))
            ->where('seo.structuredData.name', 'ZOUTH')
            ->where('seo.structuredData.url', url('/'))
        );
});

test('landing page falls back to the sales contact when demo catalog url is blank', function () {
    $this->withoutVite();

    config()->set('commercial.sales_contact_url', 'mailto:comercial@example.com');
    config()->set('commercial.demo_catalog_url', '');

    $this->get('/')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('landing/index')
            ->where('commercial.salesContactUrl', 'mailto:comercial@example.com')
            ->where('commercial.demoCatalogUrl', null)
        );
});

test('landing page rejects unsafe demo catalog urls', function () {
    $this->withoutVite();

    config()->set('commercial.demo_catalog_url', 'javascript:alert(1)');

    $this->get('/')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('landing/index')
            ->where('commercial.demoCatalogUrl', null)
        );
});

test('landing page exposes the dashboard URL for each authenticated profile', function (string $userType, string $routeName) {
    $this->withoutVite();

    $user = User::factory()->create(['user_type' => $userType]);

    $this->actingAs($user)
        ->get(route('home'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('auth.dashboard_url', route($routeName, absolute: false))
        );
})->with([
    'superadmin' => ['superadmin', 'admin.dashboard'],
    'manufacturer' => ['manufacturer_user', 'dashboard'],
    'sales representative' => ['sales_rep', 'rep.dashboard'],
]);

test('homepage does not expose a dashboard URL to guests', function () {
    $this->withoutVite();

    $this->get(route('home'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('auth.dashboard_url', null)
        );
});

test('landing shell exposes indexable metadata and the Zouth favicon set', function () {
    $this->withoutVite();

    $response = $this->get(route('home'));

    $response->assertOk()
        ->assertSee('<html lang="pt-BR">', false)
        ->assertSee('<title inertia>'.config('commercial.seo.home_title').' - ZOUTH</title>', false)
        ->assertSee('name="description" content="'.config('commercial.seo.home_description').'"', false)
        ->assertSee('name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"', false)
        ->assertSee('rel="canonical" href="'.url('/').'"', false)
        ->assertSee('property="og:title" content="'.config('commercial.seo.home_og_title').'"', false)
        ->assertSee('name="twitter:card" content="summary_large_image"', false)
        ->assertSee('type="application/ld+json"', false)
        ->assertSee('"@type":"Organization"', false)
        ->assertSee('/brand/zouth/favicon/favicon.ico', false)
        ->assertSee('/brand/zouth/favicon/favicon.svg', false)
        ->assertSee('/brand/zouth/favicon/favicon-96x96.png', false)
        ->assertSee('/brand/zouth/favicon/apple-touch-icon.png', false)
        ->assertSee('/brand/zouth/favicon/site.webmanifest', false)
        ->assertSee('name="theme-color" content="#ff4d3d"', false);

    expect(substr_count($response->getContent(), 'name="description"'))->toBe(1);
});

test('robots file allows the public site and keeps private areas out of crawl', function () {
    $this->get(route('robots'))
        ->assertOk()
        ->assertHeader('Content-Type', 'text/plain; charset=UTF-8')
        ->assertSee('User-agent: *', false)
        ->assertSee('Allow: /', false)
        ->assertSee('Disallow: /manufacturer/', false)
        ->assertSee('Disallow: /dashboard', false)
        ->assertSee('Sitemap: '.route('sitemap'), false);
});

test('sitemap exposes the indexable public pages', function () {
    $this->get(route('sitemap'))
        ->assertOk()
        ->assertHeader('Content-Type', 'application/xml; charset=UTF-8')
        ->assertSee('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', false)
        ->assertSee('<loc>'.route('home').'</loc>', false)
        ->assertSee('<loc>'.route('legal.terms').'</loc>', false)
        ->assertSee('<loc>'.route('legal.privacy').'</loc>', false)
        ->assertSee('<loc>'.route('legal.lgpd').'</loc>', false);
});

test('legal documents are publicly available', function (string $routeName, string $title) {
    $this->withoutVite();

    $this->get(route($routeName))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('legal/show')
            ->where('document.title', $title)
            ->has('document.sections')
            ->where('privacyEmail', config('commercial.privacy_email'))
        );
})->with([
    ['legal.terms', 'Termos de Uso'],
    ['legal.privacy', 'Política de Privacidade'],
    ['legal.lgpd', 'LGPD e Direitos dos Titulares'],
]);
