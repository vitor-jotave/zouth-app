<?php

use Inertia\Testing\AssertableInertia as Assert;

test('homepage exposes configured commercial links', function () {
    $this->withoutVite();

    config()->set('commercial.sales_contact_url', 'https://example.com/contact');
    config()->set('commercial.demo_catalog_url', 'https://example.com/demo');

    $this->get(route('home'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('homepage')
            ->where('commercial.salesContactUrl', 'https://example.com/contact')
            ->where('commercial.demoCatalogUrl', 'https://example.com/demo')
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
