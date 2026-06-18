<?php

use App\Http\Middleware\AddSecurityHeaders;
use App\Http\Resources\CatalogSettingResource;
use App\Http\Resources\ProductCatalogResource;
use App\Models\CatalogSetting;
use App\Models\Product;
use App\Models\ProductMedia;
use Illuminate\Http\Request;

it('serializes public catalog product images from the s3 disk', function () {
    config([
        'filesystems.default' => 'local',
        'filesystems.disks.s3.url' => 'https://cdn.zouth.app',
    ]);

    $product = Product::factory()->create();
    ProductMedia::factory()->create([
        'product_id' => $product->id,
        'path' => 'products/10/photo.jpg',
        'sort_order' => 0,
    ]);

    $payload = (new ProductCatalogResource($product->load([
        'category',
        'media',
        'productVariations.variationType.values',
        'variantStocks',
        'comboItems.componentProduct',
        'comboItems.componentVariantStock',
    ])))->resolve(request());

    expect($payload['primary_image'])->toBe('https://cdn.zouth.app/products/10/photo.jpg')
        ->and($payload['images']->all())->toBe(['https://cdn.zouth.app/products/10/photo.jpg']);
});

it('serializes catalog logo and background images from the public disk', function () {
    config([
        'filesystems.default' => 's3',
        'filesystems.disks.s3.url' => 'https://cdn.zouth.app',
        'filesystems.disks.public.url' => 'https://zouth.app/storage',
    ]);

    $setting = CatalogSetting::factory()->create([
        'logo_path' => 'catalog-logos/logo.png',
        'background_image_path' => 'catalog-backgrounds/background.jpg',
    ]);

    $payload = (new CatalogSettingResource($setting))->resolve(request());

    expect($payload['logo_url'])->toBe('https://zouth.app/storage/catalog-logos/logo.png')
        ->and($payload['background_image_url'])->toBe('https://zouth.app/storage/catalog-backgrounds/background.jpg');
});

it('allows configured s3 media hosts in the production content security policy', function () {
    $this->app->detectEnvironment(fn () => 'production');

    config([
        'filesystems.disks.s3.url' => 'https://cdn.zouth.app',
    ]);

    $response = app(AddSecurityHeaders::class)->handle(
        Request::create('/catalog/public-token'),
        fn () => response('ok')
    );

    expect($response->headers->get('Content-Security-Policy'))
        ->toContain("img-src 'self' data: blob: https://cdn.zouth.app;");
});
