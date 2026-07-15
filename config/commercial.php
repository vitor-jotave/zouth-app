<?php

return [
    'sales_contact_url' => env(
        'SALES_CONTACT_URL',
        'mailto:comercial@zouth.app?subject=Demonstra%C3%A7%C3%A3o%20do%20Zouth%20App'
    ),

    'demo_catalog_url' => env('DEMO_CATALOG_URL'),

    'privacy_email' => env('PRIVACY_CONTACT_EMAIL', 'privacidade@zouth.app'),
];
