<?php

uses(Tests\TestCase::class);

beforeEach(function () {
    $this->configuration = [
        'app.env' => 'production',
        'app.debug' => false,
        'app.key' => 'base64:'.base64_encode(str_repeat('a', 32)),
        'app.url' => 'https://zouth.app',
        'app.trusted_hosts' => ['^zouth\\.app$'],
        'trustedproxy.proxies' => '*',
        'database.default' => 'pgsql',
        'cache.default' => 'database',
        'queue.default' => 'database',
        'session.driver' => 'database',
        'session.secure' => true,
        'session.encrypt' => true,
        'mail.default' => 'smtp',
        'mail.from.address' => 'contato@zouth.app',
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
