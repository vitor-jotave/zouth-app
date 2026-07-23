<?php

use App\Models\CatalogSetting;
use App\Models\Manufacturer;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\ProductVariantStock;
use App\Models\ProductVariation;
use App\Models\User;
use App\Models\VariationType;
use App\Models\VariationValue;
use App\Models\WhatsappInstance;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->withoutVite();
    $this->manufacturer = Manufacturer::factory()->create(['is_active' => true]);
    $this->user = User::factory()->create([
        'user_type' => 'manufacturer_user',
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);
    $this->manufacturer->users()->attach($this->user->id, [
        'role' => 'owner',
        'status' => 'active',
    ]);
});

function createCatalogSettingFor(Manufacturer $manufacturer, string $token = 'public-token'): CatalogSetting
{
    return CatalogSetting::create([
        'manufacturer_id' => $manufacturer->id,
        'brand_name' => 'Zouth Atelier',
        'public_token' => $token,
        'public_link_active' => true,
    ]);
}

function attachCatalogVariation(Product $product, VariationType $type, string $value, int $quantity = 10): void
{
    ProductVariation::create([
        'product_id' => $product->id,
        'variation_type_id' => $type->id,
    ]);

    ProductVariantStock::factory()->create([
        'product_id' => $product->id,
        'variation_key' => [$type->name => $value],
        'quantity' => $quantity,
    ]);
}

function catalogSettingsUpdatePayload(array $overrides = []): array
{
    return [
        'brand_name' => 'Zouth Atelier',
        'show_brand_name' => true,
        'show_logo' => true,
        'primary_color' => '#111111',
        'secondary_color' => '#222222',
        'accent_color' => '#ff4d3d',
        'background_color' => '#f6f4f0',
        'font_family' => 'sora',
        'public_link_active' => true,
        ...$overrides,
    ];
}

it('shows the catalog settings page', function () {
    $response = $this->actingAs($this->user)
        ->get(route('manufacturer.catalog-settings.index'));

    $response->assertOk();
});

it('shows the public product count in the catalog preview', function () {
    Product::factory()
        ->count(2)
        ->forManufacturer($this->manufacturer)
        ->withoutCategory()
        ->create(['product_type' => 'product']);
    Product::factory()
        ->forManufacturer($this->manufacturer)
        ->withoutCategory()
        ->create(['product_type' => 'combo']);

    $response = $this->actingAs($this->user)
        ->get(route('manufacturer.catalog-settings.index'));

    $response->assertOk();

    expect($response->inertiaProps('product_count'))->toBe(2);
});

it('returns saved settings in page props without data wrapping', function () {
    CatalogSetting::create([
        'manufacturer_id' => $this->manufacturer->id,
        'brand_name' => 'Zouth Atelier',
        'show_brand_name' => true,
        'show_logo' => false,
        'primary_color' => '#AABBCC',
        'secondary_color' => '#112233',
        'accent_color' => '#445566',
        'background_color' => '#778899',
        'font_family' => 'sora',
        'public_link_active' => true,
    ]);

    $response = $this->actingAs($this->user)
        ->get(route('manufacturer.catalog-settings.index'));

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('manufacturer/catalog-settings/index')
            ->has('catalog_settings.brand_name')
            ->where('catalog_settings.brand_name', 'Zouth Atelier')
            ->where('catalog_settings.show_brand_name', true)
            ->where('catalog_settings.show_logo', false)
            ->where('catalog_settings.primary_color', '#AABBCC')
            ->where('catalog_settings.font_family', 'sora')
            ->missing('catalog_settings.data')
        );
});

it('updates catalog branding settings', function () {
    $payload = [
        'brand_name' => 'Zouth Atelier',
        'show_brand_name' => true,
        'show_logo' => false,
        'tagline' => 'Colecao exclusiva',
        'description' => 'Detalhes que transformam vitrines.',
        'primary_color' => '#111111',
        'secondary_color' => '#222222',
        'accent_color' => '#333333',
        'background_color' => '#f4f4f4',
        'font_family' => 'sora',
        'public_link_active' => true,
    ];

    $response = $this->actingAs($this->user)
        ->put(route('manufacturer.catalog-settings.update'), $payload);

    $response->assertRedirect();

    $this->assertDatabaseHas('catalog_settings', [
        'manufacturer_id' => $this->manufacturer->id,
        'brand_name' => 'Zouth Atelier',
        'show_brand_name' => true,
        'show_logo' => false,
        'primary_color' => '#111111',
        'font_family' => 'sora',
    ]);
});

it('saves the catalog logo size inside the cover settings', function () {
    $setting = createCatalogSettingFor($this->manufacturer);
    $sections = CatalogSetting::defaultSections();
    $sections[0]['props']['logo_size'] = 145;

    $this->actingAs($this->user)
        ->put(
            route('manufacturer.catalog-settings.update'),
            catalogSettingsUpdatePayload(['sections' => $sections]),
        )
        ->assertRedirect()
        ->assertSessionDoesntHaveErrors();

    expect($setting->fresh()->sections[0]['props']['logo_size'])->toBe(145);
});

it('rejects a catalog logo size outside the editor range', function (int $logoSize) {
    createCatalogSettingFor($this->manufacturer);
    $sections = CatalogSetting::defaultSections();
    $sections[0]['props']['logo_size'] = $logoSize;

    $this->actingAs($this->user)
        ->put(
            route('manufacturer.catalog-settings.update'),
            catalogSettingsUpdatePayload(['sections' => $sections]),
        )
        ->assertSessionHasErrors('sections.0.props.logo_size');
})->with([
    'smaller than the minimum' => 49,
    'larger than the maximum' => 201,
]);

it('saves the campaign image fit and manual scale inside the cover settings', function () {
    $setting = createCatalogSettingFor($this->manufacturer);
    $sections = CatalogSetting::defaultSections();
    $sections[0]['props']['image_fit'] = 'manual';
    $sections[0]['props']['image_scale'] = 135;

    $this->actingAs($this->user)
        ->put(
            route('manufacturer.catalog-settings.update'),
            catalogSettingsUpdatePayload(['sections' => $sections]),
        )
        ->assertRedirect()
        ->assertSessionDoesntHaveErrors();

    $hero = collect($setting->fresh()->sections)->firstWhere('type', 'hero');

    expect($hero['props']['image_fit'])->toBe('manual')
        ->and($hero['props']['image_scale'])->toBe(135);
});

it('rejects an unsupported campaign image fit', function () {
    createCatalogSettingFor($this->manufacturer);
    $sections = CatalogSetting::defaultSections();
    $sections[0]['props']['image_fit'] = 'repeat';

    $this->actingAs($this->user)
        ->put(
            route('manufacturer.catalog-settings.update'),
            catalogSettingsUpdatePayload(['sections' => $sections]),
        )
        ->assertSessionHasErrors('sections.0.props.image_fit');
});

it('rejects a manual campaign image scale outside the editor range', function (int $imageScale) {
    createCatalogSettingFor($this->manufacturer);
    $sections = CatalogSetting::defaultSections();
    $sections[0]['props']['image_fit'] = 'manual';
    $sections[0]['props']['image_scale'] = $imageScale;

    $this->actingAs($this->user)
        ->put(
            route('manufacturer.catalog-settings.update'),
            catalogSettingsUpdatePayload(['sections' => $sections]),
        )
        ->assertSessionHasErrors('sections.0.props.image_scale');
})->with([
    'smaller than the minimum' => 49,
    'larger than the maximum' => 201,
]);

it('renders the logo size controls in the studio and public catalog', function () {
    $studio = file_get_contents(resource_path('js/pages/manufacturer/catalog-settings/index.tsx'));
    $catalog = file_get_contents(resource_path('js/pages/public/catalog.tsx'));

    expect($studio)
        ->toContain('Tamanho da logo')
        ->toContain("'logo_size'")
        ->toContain('CATALOG_LOGO_SIZE')
        ->and($catalog)
        ->toContain('catalogLogoStyle(')
        ->toContain('heroSection?.props?.logo_size');
});

it('shows the connected commercial channel in the catalog editor', function () {
    createCatalogSettingFor($this->manufacturer);
    WhatsappInstance::factory()->connected()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'phone_number' => '+55 (11) 99999-1234',
        'profile_name' => 'Comercial Zouth',
    ]);

    $this->actingAs($this->user)
        ->get(route('manufacturer.catalog-settings.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('whatsapp_channel.available', true)
            ->where('whatsapp_channel.profile_name', 'Comercial Zouth')
            ->where('whatsapp_channel.phone_masked', '+55 (11) •••••-1234')
            ->where('whatsapp_channel.channels_url', route('manufacturer.atendimento.channels'))
        );
});

it('enables negotiation by whatsapp when the manufacturer has a connected channel', function () {
    createCatalogSettingFor($this->manufacturer);
    WhatsappInstance::factory()->connected()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'phone_number' => '+5511999991234',
    ]);

    $this->actingAs($this->user)
        ->put(
            route('manufacturer.catalog-settings.update'),
            catalogSettingsUpdatePayload(['hide_prices' => true]),
        )
        ->assertRedirect()
        ->assertSessionDoesntHaveErrors();

    $this->assertDatabaseHas('catalog_settings', [
        'manufacturer_id' => $this->manufacturer->id,
        'hide_prices' => true,
    ]);
});

it('does not enable hidden prices using another manufacturer channel', function () {
    createCatalogSettingFor($this->manufacturer);
    $otherManufacturer = Manufacturer::factory()->create(['is_active' => true]);
    WhatsappInstance::factory()->connected()->create([
        'manufacturer_id' => $otherManufacturer->id,
        'phone_number' => '+5511988881234',
    ]);

    $this->actingAs($this->user)
        ->put(
            route('manufacturer.catalog-settings.update'),
            catalogSettingsUpdatePayload(['hide_prices' => true]),
        )
        ->assertSessionHasErrors('hide_prices');

    $this->assertDatabaseHas('catalog_settings', [
        'manufacturer_id' => $this->manufacturer->id,
        'hide_prices' => false,
    ]);
});

it('does not enable hidden prices with an invalid connected phone number', function () {
    createCatalogSettingFor($this->manufacturer);
    WhatsappInstance::factory()->connected()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'phone_number' => '+55',
    ]);

    $this->actingAs($this->user)
        ->put(
            route('manufacturer.catalog-settings.update'),
            catalogSettingsUpdatePayload(['hide_prices' => true]),
        )
        ->assertSessionHasErrors('hide_prices');

    $this->assertDatabaseHas('catalog_settings', [
        'manufacturer_id' => $this->manufacturer->id,
        'hide_prices' => false,
    ]);
});

it('keeps an already hidden catalog private when its channel disconnects', function () {
    $setting = createCatalogSettingFor($this->manufacturer);
    $setting->update(['hide_prices' => true]);

    $this->actingAs($this->user)
        ->put(
            route('manufacturer.catalog-settings.update'),
            catalogSettingsUpdatePayload([
                'hide_prices' => true,
                'tagline' => 'Uma nova coleção',
            ]),
        )
        ->assertRedirect()
        ->assertSessionDoesntHaveErrors();

    expect($setting->fresh()->hide_prices)->toBeTrue()
        ->and($setting->fresh()->tagline)->toBe('Uma nova coleção');
});

it('uploads a catalog logo', function () {
    Storage::fake('public');
    config(['filesystems.catalog_media_disk' => 'public']);

    $response = $this->actingAs($this->user)->post(
        route('manufacturer.catalog-settings.logo'),
        ['logo' => UploadedFile::fake()->image('logo.png')]
    );

    $response->assertRedirect();

    $setting = CatalogSetting::first();
    expect($setting)->not->toBeNull();

    Storage::disk('public')->assertExists($setting->logo_path);
});

it('uploads catalog logo to the configured catalog media disk', function () {
    Storage::fake('s3');
    config(['filesystems.catalog_media_disk' => 's3']);

    $response = $this->actingAs($this->user)->post(
        route('manufacturer.catalog-settings.logo'),
        ['logo' => UploadedFile::fake()->image('logo.png')]
    );

    $response->assertRedirect();

    $setting = CatalogSetting::first();
    expect($setting)->not->toBeNull();

    Storage::disk('s3')->assertExists($setting->logo_path);
});

it('rotates the public catalog link', function () {
    $setting = CatalogSetting::create([
        'manufacturer_id' => $this->manufacturer->id,
        'brand_name' => 'Zouth Atelier',
        'public_token' => 'old-token',
        'public_link_active' => true,
    ]);

    $response = $this->actingAs($this->user)
        ->post(route('manufacturer.catalog-settings.rotate-link'));

    $response->assertRedirect();

    $setting->refresh();

    expect($setting->public_token)->not->toBe('old-token');
    expect($setting->public_token_rotated_at)->not->toBeNull();
});

it('renders the public catalog and tracks visits', function () {
    $setting = createCatalogSettingFor($this->manufacturer);

    $response = $this->get(route('public.catalog.show', ['token' => $setting->public_token]));

    $response->assertOk();

    $this->assertDatabaseHas('catalog_visits', [
        'manufacturer_id' => $this->manufacturer->id,
        'public_token' => 'public-token',
    ]);
});

it('includes product description in public catalog props for quick view', function () {
    $setting = createCatalogSettingFor($this->manufacturer);

    Product::factory()->forManufacturer($this->manufacturer)->withoutCategory()->create([
        'name' => 'Macacão Bordado',
        'sku' => 'MAC-BORDADO',
        'description' => 'Macacão em algodão com bordado delicado.',
        'is_active' => true,
    ]);

    $response = $this->get(route('public.catalog.show', ['token' => $setting->public_token]));
    $productProps = collect($response->inertiaProps('products.data'))->firstWhere('name', 'Macacão Bordado');

    expect($productProps['description'])->toBe('Macacão em algodão com bordado delicado.');
});

it('removes prices from the public contract and exposes only a sanitized whatsapp link', function () {
    $setting = createCatalogSettingFor($this->manufacturer);
    $setting->update(['hide_prices' => true]);
    WhatsappInstance::factory()->connected()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'phone_number' => '+55 (11) 97777-4321',
    ]);

    $product = Product::factory()->forManufacturer($this->manufacturer)->withoutCategory()->create([
        'name' => 'Conjunto Essencial',
        'price_cents' => 12990,
        'is_active' => true,
    ]);
    ProductVariantStock::factory()->create([
        'product_id' => $product->id,
        'variation_key' => ['Tamanho' => 'M'],
        'quantity' => 8,
        'price_cents' => 13990,
    ]);

    $response = $this->get(route('public.catalog.show', ['token' => $setting->public_token]));
    $publicProduct = collect($response->inertiaProps('products.data'))->firstWhere('id', $product->id);

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('catalog_settings.hide_prices', true)
            ->where('whatsapp_checkout.enabled', true)
            ->where('whatsapp_checkout.available', true)
            ->where('whatsapp_checkout.base_url', 'https://wa.me/5511977774321')
            ->missing('whatsapp_checkout.instance_id')
        );

    expect($publicProduct)->not->toHaveKey('price_cents')
        ->and($publicProduct['variant_stocks'][0])->not->toHaveKey('price_cents');
});

it('filters public catalog products by name or sku search', function () {
    $setting = createCatalogSettingFor($this->manufacturer);

    Product::factory()->forManufacturer($this->manufacturer)->withoutCategory()->create([
        'name' => 'Body Canelado',
        'sku' => 'BODY-001',
    ]);
    Product::factory()->forManufacturer($this->manufacturer)->withoutCategory()->create([
        'name' => 'Macacão Listrado',
        'sku' => 'MAC-001',
    ]);
    Product::factory()->forManufacturer($this->manufacturer)->withoutCategory()->create([
        'name' => 'Conjunto Floral',
        'sku' => 'BODY-FLORAL',
    ]);

    $response = $this->get(route('public.catalog.show', [
        'token' => $setting->public_token,
        'search' => 'body',
    ]));

    $names = collect($response->inertiaProps('products.data'))->pluck('name');

    expect($names->all())->toBe(['Body Canelado', 'Conjunto Floral']);
    expect($response->inertiaProps('filters.search'))->toBe('body');

    $accentlessResponse = $this->get(route('public.catalog.show', [
        'token' => $setting->public_token,
        'search' => 'macacao',
    ]));

    expect(collect($accentlessResponse->inertiaProps('products.data'))->pluck('name')->all())
        ->toBe(['Macacão Listrado']);
});

it('filters public catalog products by category', function () {
    $setting = createCatalogSettingFor($this->manufacturer);
    $summer = ProductCategory::factory()->forManufacturer($this->manufacturer)->create(['name' => 'Verao']);
    $outlet = ProductCategory::factory()->forManufacturer($this->manufacturer)->create(['name' => 'Outlet']);

    Product::factory()->forManufacturer($this->manufacturer)->create([
        'name' => 'Body Verao',
        'product_category_id' => $summer->id,
    ]);
    Product::factory()->forManufacturer($this->manufacturer)->create([
        'name' => 'Body Outlet',
        'product_category_id' => $outlet->id,
    ]);

    $response = $this->get(route('public.catalog.show', [
        'token' => $setting->public_token,
        'category_id' => $summer->id,
    ]));

    expect(collect($response->inertiaProps('products.data'))->pluck('name')->all())
        ->toBe(['Body Verao']);
    expect($response->inertiaProps('filters.category_id'))->toBe((string) $summer->id);
});

it('filters public catalog products by dynamic variation values', function () {
    $setting = createCatalogSettingFor($this->manufacturer);
    $color = VariationType::factory()->colorType()->create([
        'manufacturer_id' => $this->manufacturer->id,
    ]);
    VariationValue::factory()->create([
        'variation_type_id' => $color->id,
        'value' => 'Vermelho',
        'hex' => '#ef4444',
    ]);
    VariationValue::factory()->create([
        'variation_type_id' => $color->id,
        'value' => 'Azul',
        'hex' => '#3b82f6',
    ]);

    $redProduct = Product::factory()->forManufacturer($this->manufacturer)->withoutCategory()->create(['name' => 'Body Vermelho']);
    Product::factory()->forManufacturer($this->manufacturer)->withoutCategory()->create(['name' => 'Body Sem Variacao']);

    attachCatalogVariation($redProduct, $color, 'Vermelho', 10);

    $response = $this->get(route('public.catalog.show', [
        'token' => $setting->public_token,
        'variations' => [
            $color->id => ['Vermelho'],
        ],
    ]));

    expect(collect($response->inertiaProps('products.data'))->pluck('name')->all())
        ->toBe(['Body Vermelho']);
    expect($response->inertiaProps("filters.variations.{$color->id}"))->toBe(['Vermelho']);
    expect(collect($response->inertiaProps('filter_options.variation_types.0.values'))->pluck('value')->all())
        ->toBe(['Vermelho']);
});

it('limits public catalog variations to values with positive stock on that product', function () {
    $setting = createCatalogSettingFor($this->manufacturer);
    $color = VariationType::factory()->colorType()->create([
        'manufacturer_id' => $this->manufacturer->id,
    ]);
    $size = VariationType::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'name' => 'Tamanho',
    ]);

    foreach ([
        ['value' => 'Azul', 'hex' => '#3b82f6'],
        ['value' => 'Vermelho', 'hex' => '#ef4444'],
        ['value' => 'Verde', 'hex' => '#22c55e'],
    ] as $value) {
        VariationValue::factory()->create([
            'variation_type_id' => $color->id,
            ...$value,
        ]);
    }

    foreach (['P', 'M', 'G'] as $value) {
        VariationValue::factory()->create([
            'variation_type_id' => $size->id,
            'value' => $value,
        ]);
    }

    $product = Product::factory()->forManufacturer($this->manufacturer)->withoutCategory()->create([
        'name' => 'Body Azul P',
    ]);
    ProductVariation::create(['product_id' => $product->id, 'variation_type_id' => $color->id]);
    ProductVariation::create(['product_id' => $product->id, 'variation_type_id' => $size->id]);
    ProductVariantStock::factory()->create([
        'product_id' => $product->id,
        'variation_key' => ['Cor' => 'Azul', 'Tamanho' => 'P'],
        'quantity' => 4,
    ]);
    ProductVariantStock::factory()->create([
        'product_id' => $product->id,
        'variation_key' => ['Cor' => 'Vermelho', 'Tamanho' => 'M'],
        'quantity' => 0,
    ]);

    $response = $this->get(route('public.catalog.show', ['token' => $setting->public_token]));
    $productProps = collect($response->inertiaProps('products.data'))->firstWhere('name', 'Body Azul P');

    expect(collect($productProps['variations'])->firstWhere('type_name', 'Cor')['values'])
        ->toBe([['value' => 'Azul', 'hex' => '#3b82f6', 'image_url' => null]]);
    expect(collect($productProps['variations'])->firstWhere('type_name', 'Tamanho')['values'])
        ->toBe([['value' => 'P', 'hex' => null, 'image_url' => null]]);
    expect(collect($response->inertiaProps('filter_options.variation_types'))->firstWhere('name', 'Cor')['values'])
        ->toBe([['value' => 'Azul', 'hex' => '#3b82f6', 'image_url' => null]]);
});

it('keeps out of stock variation values available when the product accepts quotes', function () {
    $setting = createCatalogSettingFor($this->manufacturer);
    $color = VariationType::factory()->colorType()->create([
        'manufacturer_id' => $this->manufacturer->id,
    ]);

    VariationValue::factory()->create([
        'variation_type_id' => $color->id,
        'value' => 'Vermelho',
        'hex' => '#ef4444',
    ]);

    $product = Product::factory()->forManufacturer($this->manufacturer)->withoutCategory()->create([
        'name' => 'Body sob orçamento',
        'base_quantity' => 0,
        'allow_quote_when_out_of_stock' => true,
    ]);
    ProductVariation::create([
        'product_id' => $product->id,
        'variation_type_id' => $color->id,
    ]);
    ProductVariantStock::factory()->create([
        'product_id' => $product->id,
        'variation_key' => ['Cor' => 'Vermelho'],
        'quantity' => 0,
    ]);

    $response = $this->get(route('public.catalog.show', [
        'token' => $setting->public_token,
        'variations' => [$color->id => ['Vermelho']],
    ]));
    $productProps = collect($response->inertiaProps('products.data'))->sole();

    expect($productProps['allow_quote_when_out_of_stock'])->toBeTrue()
        ->and($productProps['variations'][0]['values'])->toBe([[
            'value' => 'Vermelho',
            'hex' => '#ef4444',
            'image_url' => null,
        ]])
        ->and(collect($response->inertiaProps('filter_options.variation_types.0.values'))->pluck('value')->all())
        ->toBe(['Vermelho']);
});

it('does not match catalog filters against out of stock variation values', function () {
    $setting = createCatalogSettingFor($this->manufacturer);
    $color = VariationType::factory()->colorType()->create([
        'manufacturer_id' => $this->manufacturer->id,
    ]);

    foreach (['Azul', 'Vermelho'] as $value) {
        VariationValue::factory()->create([
            'variation_type_id' => $color->id,
            'value' => $value,
        ]);
    }

    $product = Product::factory()->forManufacturer($this->manufacturer)->withoutCategory()->create();
    ProductVariation::create(['product_id' => $product->id, 'variation_type_id' => $color->id]);
    ProductVariantStock::factory()->create([
        'product_id' => $product->id,
        'variation_key' => ['Cor' => 'Azul'],
        'quantity' => 3,
    ]);
    ProductVariantStock::factory()->create([
        'product_id' => $product->id,
        'variation_key' => ['Cor' => 'Vermelho'],
        'quantity' => 0,
    ]);

    $response = $this->get(route('public.catalog.show', [
        'token' => $setting->public_token,
        'variations' => [$color->id => ['Vermelho']],
    ]));

    expect($response->inertiaProps('products.data'))->toBe([]);
    expect(collect($response->inertiaProps('filter_options.variation_types.0.values'))->pluck('value')->all())
        ->toBe(['Azul']);
});

it('exposes variation image swatches in public catalog products and filters', function () {
    $setting = createCatalogSettingFor($this->manufacturer);
    $color = VariationType::factory()->colorType()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'name' => 'Cor',
    ]);

    VariationValue::factory()->create([
        'variation_type_id' => $color->id,
        'value' => 'Bolinhas',
        'hex' => null,
        'image_path' => 'variation-values/bolinhas.png',
        'thumbnail_path' => 'variation-values/thumbnails/bolinhas.webp',
    ]);

    $product = Product::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'name' => 'Body Bolinhas',
        'is_active' => true,
    ]);

    attachCatalogVariation($product, $color, 'Bolinhas');

    $response = $this->get(route('public.catalog.show', ['token' => $setting->public_token]));
    $productProps = collect($response->inertiaProps('products.data'))->firstWhere('name', 'Body Bolinhas');
    $productColor = collect($productProps['variations'])->firstWhere('type_name', 'Cor');
    $filterColor = collect($response->inertiaProps('filter_options.variation_types'))->firstWhere('name', 'Cor');

    expect($productColor['values'][0]['image_url'])->toContain('variation-values/thumbnails/bolinhas.webp');
    expect($filterColor['values'][0]['image_url'])->toContain('variation-values/thumbnails/bolinhas.webp');
});

it('keeps legacy variation texture swatches available without a thumbnail', function () {
    $setting = createCatalogSettingFor($this->manufacturer);
    $color = VariationType::factory()->colorType()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'name' => 'Cor',
    ]);

    VariationValue::factory()->create([
        'variation_type_id' => $color->id,
        'value' => 'Xadrez',
        'hex' => null,
        'image_path' => 'variation-values/xadrez-legado.png',
        'thumbnail_path' => null,
    ]);

    $product = Product::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'name' => 'Body Xadrez',
        'is_active' => true,
    ]);

    attachCatalogVariation($product, $color, 'Xadrez');

    $response = $this->get(route('public.catalog.show', ['token' => $setting->public_token]));
    $productProps = collect($response->inertiaProps('products.data'))->firstWhere('name', 'Body Xadrez');
    $productColor = collect($productProps['variations'])->firstWhere('type_name', 'Cor');
    $filterColor = collect($response->inertiaProps('filter_options.variation_types'))->firstWhere('name', 'Cor');

    expect($productColor['values'][0]['image_url'])->toContain('variation-values/xadrez-legado.png');
    expect($filterColor['values'][0]['image_url'])->toContain('variation-values/xadrez-legado.png');
});

it('combines search category and variation filters in the public catalog', function () {
    $setting = createCatalogSettingFor($this->manufacturer);
    $category = ProductCategory::factory()->forManufacturer($this->manufacturer)->create(['name' => 'Conjuntos']);
    $otherCategory = ProductCategory::factory()->forManufacturer($this->manufacturer)->create(['name' => 'Bodies']);
    $size = VariationType::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'name' => 'Tamanho',
    ]);
    $color = VariationType::factory()->colorType()->create([
        'manufacturer_id' => $this->manufacturer->id,
    ]);

    foreach (['G', 'M'] as $value) {
        VariationValue::factory()->create(['variation_type_id' => $size->id, 'value' => $value]);
    }
    foreach (['Vermelho', 'Azul'] as $value) {
        VariationValue::factory()->create(['variation_type_id' => $color->id, 'value' => $value]);
    }

    $matching = Product::factory()->forManufacturer($this->manufacturer)->create([
        'name' => 'Conjunto Body Festa',
        'sku' => 'FESTA-001',
        'product_category_id' => $category->id,
    ]);
    ProductVariation::create(['product_id' => $matching->id, 'variation_type_id' => $size->id]);
    ProductVariation::create(['product_id' => $matching->id, 'variation_type_id' => $color->id]);
    ProductVariantStock::factory()->create([
        'product_id' => $matching->id,
        'variation_key' => ['Tamanho' => 'G', 'Cor' => 'Vermelho'],
        'quantity' => 8,
    ]);

    $wrongVariation = Product::factory()->forManufacturer($this->manufacturer)->create([
        'name' => 'Conjunto Body Casual',
        'sku' => 'CASUAL-001',
        'product_category_id' => $category->id,
    ]);
    ProductVariation::create(['product_id' => $wrongVariation->id, 'variation_type_id' => $size->id]);
    ProductVariation::create(['product_id' => $wrongVariation->id, 'variation_type_id' => $color->id]);
    ProductVariantStock::factory()->create([
        'product_id' => $wrongVariation->id,
        'variation_key' => ['Tamanho' => 'M', 'Cor' => 'Vermelho'],
        'quantity' => 8,
    ]);

    $wrongCategory = Product::factory()->forManufacturer($this->manufacturer)->create([
        'name' => 'Body Festa Avulso',
        'sku' => 'FESTA-002',
        'product_category_id' => $otherCategory->id,
    ]);
    ProductVariation::create(['product_id' => $wrongCategory->id, 'variation_type_id' => $size->id]);
    ProductVariation::create(['product_id' => $wrongCategory->id, 'variation_type_id' => $color->id]);
    ProductVariantStock::factory()->create([
        'product_id' => $wrongCategory->id,
        'variation_key' => ['Tamanho' => 'G', 'Cor' => 'Vermelho'],
        'quantity' => 8,
    ]);

    $response = $this->get(route('public.catalog.show', [
        'token' => $setting->public_token,
        'search' => 'Festa',
        'category_id' => $category->id,
        'variations' => [
            $size->id => ['G'],
            $color->id => ['Vermelho'],
        ],
    ]));

    expect(collect($response->inertiaProps('products.data'))->pluck('name')->all())
        ->toBe(['Conjunto Body Festa']);
});

it('does not expose filter options from another manufacturer', function () {
    $setting = createCatalogSettingFor($this->manufacturer);
    $ownCategory = ProductCategory::factory()->forManufacturer($this->manufacturer)->create(['name' => 'Bodies']);
    $otherManufacturer = Manufacturer::factory()->create(['is_active' => true]);
    $otherCategory = ProductCategory::factory()->forManufacturer($otherManufacturer)->create(['name' => 'Outlet externo']);
    $ownColor = VariationType::factory()->colorType()->create([
        'manufacturer_id' => $this->manufacturer->id,
    ]);
    $otherColor = VariationType::factory()->colorType()->create([
        'manufacturer_id' => $otherManufacturer->id,
    ]);

    VariationValue::factory()->create(['variation_type_id' => $ownColor->id, 'value' => 'Azul', 'hex' => '#3b82f6']);
    VariationValue::factory()->create(['variation_type_id' => $otherColor->id, 'value' => 'Preto', 'hex' => '#000000']);

    $ownProduct = Product::factory()->forManufacturer($this->manufacturer)->create([
        'product_category_id' => $ownCategory->id,
    ]);
    $otherProduct = Product::factory()->forManufacturer($otherManufacturer)->create([
        'product_category_id' => $otherCategory->id,
    ]);

    attachCatalogVariation($ownProduct, $ownColor, 'Azul');
    attachCatalogVariation($otherProduct, $otherColor, 'Preto');

    $response = $this->get(route('public.catalog.show', ['token' => $setting->public_token]));

    expect(collect($response->inertiaProps('filter_options.categories'))->pluck('name')->all())
        ->toBe(['Bodies']);
    expect(collect($response->inertiaProps('filter_options.variation_types'))->pluck('name')->all())
        ->toBe(['Cor']);
    expect(collect($response->inertiaProps('filter_options.variation_types.0.values'))->pluck('value')->all())
        ->toBe(['Azul']);
});

it('keeps public catalog filters in pagination links', function () {
    $setting = createCatalogSettingFor($this->manufacturer);

    Product::factory()
        ->count(25)
        ->forManufacturer($this->manufacturer)
        ->withoutCategory()
        ->sequence(fn ($sequence) => [
            'name' => 'Body Paginado '.str_pad((string) $sequence->index, 2, '0', STR_PAD_LEFT),
            'sku' => 'BODY-PAG-'.$sequence->index,
        ])
        ->create();

    $response = $this->get(route('public.catalog.show', [
        'token' => $setting->public_token,
        'search' => 'Body Paginado',
    ]));

    $links = collect($response->inertiaProps('products.meta.links'))->pluck('url')->filter();

    expect($links->contains(fn (string $url) => str_contains($url, 'search=Body%20Paginado') || str_contains($url, 'search=Body+Paginado')))
        ->toBeTrue();
});

it('tracks utm parameters when visiting public catalog', function () {
    $setting = CatalogSetting::create([
        'manufacturer_id' => $this->manufacturer->id,
        'brand_name' => 'Zouth Atelier',
        'public_token' => 'public-token',
        'public_link_active' => true,
    ]);

    $response = $this->get(route('public.catalog.show', [
        'token' => $setting->public_token,
        'utm_source' => 'instagram',
        'utm_medium' => 'social',
        'utm_campaign' => 'summer-2026',
    ]));

    $response->assertOk();

    $this->assertDatabaseHas('catalog_visits', [
        'manufacturer_id' => $this->manufacturer->id,
        'public_token' => 'public-token',
        'utm_source' => 'instagram',
        'utm_medium' => 'social',
        'utm_campaign' => 'summer-2026',
    ]);
});

it('blocks access to public catalog when manufacturer is inactive', function () {
    $this->manufacturer->update(['is_active' => false]);

    $setting = CatalogSetting::create([
        'manufacturer_id' => $this->manufacturer->id,
        'brand_name' => 'Zouth Atelier',
        'public_token' => 'public-token',
        'public_link_active' => true,
    ]);

    $response = $this->get(route('public.catalog.show', ['token' => $setting->public_token]));

    $response->assertNotFound();
});

it('blocks access to public catalog when link is inactive', function () {
    $setting = CatalogSetting::create([
        'manufacturer_id' => $this->manufacturer->id,
        'brand_name' => 'Zouth Atelier',
        'public_token' => 'public-token',
        'public_link_active' => false,
    ]);

    $response = $this->get(route('public.catalog.show', ['token' => $setting->public_token]));

    $response->assertNotFound();
});

it('resets catalog settings to defaults', function () {
    $setting = CatalogSetting::create([
        'manufacturer_id' => $this->manufacturer->id,
        'brand_name' => 'Custom Brand',
        'primary_color' => '#111111',
        'secondary_color' => '#222222',
        'accent_color' => '#333333',
        'background_color' => '#f4f4f4',
        'font_family' => 'sora',
        'public_link_active' => true,
    ]);

    $response = $this->actingAs($this->user)
        ->post(route('manufacturer.catalog-settings.reset-defaults'));

    $response->assertRedirect();

    $setting->refresh();

    expect($setting->primary_color)->toBe('#0F766E')
        ->and($setting->secondary_color)->toBe('#0F172A')
        ->and($setting->accent_color)->toBe('#F97316')
        ->and($setting->background_color)->toBe('#F8FAFC')
        ->and($setting->font_family)->toBe('space-grotesk')
        ->and($setting->hide_prices)->toBeFalse();
});
