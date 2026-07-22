<?php

return [
    'sales_contact_url' => env(
        'SALES_CONTACT_URL',
        'mailto:comercial@zouth.app?subject=Demonstra%C3%A7%C3%A3o%20do%20Zouth%20App'
    ),

    'demo_catalog_url' => env('DEMO_CATALOG_URL'),

    'privacy_email' => env('PRIVACY_CONTACT_EMAIL', 'privacidade@zouth.app'),

    'seo' => [
        'home_title' => 'Catálogo digital para fabricantes de moda infantil',
        'home_description' => 'Crie um catálogo digital para moda infantil e atacado. Apresente coleções, conecte representantes e venda a lojistas. Teste a Zouth grátis por 7 dias.',
        'home_og_title' => 'ZOUTH — Catálogo digital para moda infantil',
        'home_og_description' => 'Apresente coleções, conecte representantes e leve sua marca até lojistas com um catálogo sempre atualizado.',
    ],
];
