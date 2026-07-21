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
            ->where('seo.canonicalUrl', url('/'))
            ->where('seo.shareImageUrl', url('/brand/zouth/landing/collection-in-motion.webp'))
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
