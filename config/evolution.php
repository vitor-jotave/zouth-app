<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Evolution API Base URL
    |--------------------------------------------------------------------------
    |
    | The base URL of your Evolution API instance.
    |
    */

    'url' => env('EVOLUTION_API_URL', 'http://localhost:8080'),

    /*
    |--------------------------------------------------------------------------
    | Evolution API Key
    |--------------------------------------------------------------------------
    |
    | The global API key used to authenticate requests to the Evolution API.
    |
    */

    'api_key' => env('EVOLUTION_API_KEY', ''),

    /*
    |--------------------------------------------------------------------------
    | Webhook URL
    |--------------------------------------------------------------------------
    |
    | The base URL of this application, used to register webhooks in Evolution.
    | Defaults to APP_URL.
    |
    */

    'webhook_url' => env('EVOLUTION_WEBHOOK_URL', env('APP_URL')),

];
