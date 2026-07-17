<?php

uses(Tests\TestCase::class);

beforeEach(function () {
    $this->configuration = [
        'app.env' => 'production',
        'app.debug' => false,
        'app.key' => 'base64:'.base64_encode(str_repeat('a', 32)),
        'app.url' => 'https://zouth.app',
        'app.trusted_hosts' => ['^zouth\\.app$'],
        'logging.default' => 'stack',
        'logging.channels.stack.channels' => ['stderr'],
        'trustedproxy.proxies' => '*',
        'database.default' => 'pgsql',
        'cache.default' => 'database',
        'queue.default' => 'database',
        'session.driver' => 'database',
        'session.secure' => true,
        'session.encrypt' => true,
        'mail.default' => 'smtp',
        'mail.from.address' => 'contato@zouth.app',
        'commercial.sales_contact_url' => 'mailto:comercial@zouth.app?subject=Zouth',
        'commercial.privacy_email' => 'privacidade@zouth.app',
        'filesystems.default' => 's3',
        'filesystems.catalog_media_disk' => 's3',
        'filesystems.disks.s3.key' => 'key',
        'filesystems.disks.s3.secret' => 'secret',
        'filesystems.disks.s3.bucket' => 'zouth-prod',
        'filesystems.disks.s3.url' => 'https://cdn.zouth.app',
        'filesystems.disks.s3.endpoint' => 'https://account.r2.cloudflarestorage.com',
        'cashier.key' => 'pk_live_test',
        'cashier.secret' => 'sk_live_test',
        'cashier.webhook.secret' => 'whsec_test',
        'evolution.url' => 'https://evolution.zouth.app',
        'evolution.api_key' => 'evolution-key',
        'evolution.webhook_url' => 'https://zouth.app',
    ];
});

it('accepts a complete production configuration', function () {
    config($this->configuration);

    $this->artisan('app:verify-production', ['--skip-connectivity' => true])
        ->assertSuccessful();
});

it('rejects an unsafe production configuration', function () {
    config([...$this->configuration, 'app.debug' => true]);

    $this->artisan('app:verify-production', ['--skip-connectivity' => true])
        ->assertExitCode(1);
});

it('rejects Stripe test mode credentials in production', function () {
    config([
        ...$this->configuration,
        'cashier.key' => 'pk_test_example',
        'cashier.secret' => 'sk_test_example',
    ]);

    $this->artisan('app:verify-production', ['--skip-connectivity' => true])
        ->expectsOutputToContain('STRIPE_KEY')
        ->expectsOutputToContain('STRIPE_SECRET')
        ->assertExitCode(1);
});

it('rejects malformed critical production values', function (array $overrides, string $expectedFailure) {
    config([...$this->configuration, ...$overrides]);

    $this->artisan('app:verify-production', ['--skip-connectivity' => true])
        ->expectsOutputToContain($expectedFailure)
        ->assertExitCode(1);
})->with([
    'application URL without a host' => [['app.url' => 'https://'], 'APP_URL'],
    'invalid mail sender' => [['mail.from.address' => 'not-an-email'], 'MAIL_FROM_ADDRESS'],
    'invalid commercial URL' => [['commercial.sales_contact_url' => 'javascript:alert(1)'], 'SALES_CONTACT_URL'],
    'invalid commercial mailto' => [['commercial.sales_contact_url' => 'mailto:not-an-email'], 'SALES_CONTACT_URL'],
    'invalid privacy email' => [['commercial.privacy_email' => 'not-an-email'], 'PRIVACY_CONTACT_EMAIL'],
    'invalid CDN URL' => [['filesystems.disks.s3.url' => 'https://'], 'AWS_URL'],
    'insecure S3 endpoint' => [['filesystems.disks.s3.endpoint' => 'http://storage.example.com'], 'AWS_ENDPOINT'],
    'Stripe webhook without signature prefix' => [['cashier.webhook.secret' => 'stripe-secret'], 'STRIPE_WEBHOOK_SECRET'],
    'invalid Evolution API URL' => [['evolution.url' => 'https://'], 'EVOLUTION_API_URL'],
    'insecure Evolution webhook URL' => [['evolution.webhook_url' => 'http://zouth.app'], 'EVOLUTION_WEBHOOK_URL'],
]);

it('rejects production logs that are only written to local files', function () {
    config([
        ...$this->configuration,
        'logging.default' => 'single',
    ]);

    $this->artisan('app:verify-production', ['--skip-connectivity' => true])
        ->expectsOutputToContain('LOG_CHANNEL')
        ->assertExitCode(1);
});
