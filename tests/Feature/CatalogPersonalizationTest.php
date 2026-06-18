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

it('shows the catalog settings page', function () {
    $response = $this->actingAs($this->user)
        ->get(route('manufacturer.catalog-settings.index'));

    $response->assertOk();
});

it('returns saved settings in page props without data wrapping', function () {
    CatalogSetting::create([
        'manufacturer_id' => $this->manufacturer->id,
        'brand_name' => 'Zouth Atelier',
        'primary_color' => '#AABBCC',
        'secondary_color' => '#112233',
        'accent_color' => '#445566',
        'background_color' => '#778899',
        'font_family' => 'fraunces',
        'public_link_active' => true,
    ]);

    $response = $this->actingAs($this->user)
        ->get(route('manufacturer.catalog-settings.index'));

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('manufacturer/catalog-settings/index')
            ->has('catalog_settings.brand_name')
            ->where('catalog_settings.brand_name', 'Zouth Atelier')
            ->where('catalog_settings.primary_color', '#AABBCC')
            ->where('catalog_settings.font_family', 'fraunces')
            ->missing('catalog_settings.data')
        );
});

it('updates catalog branding settings', function () {
    $payload = [
        'brand_name' => 'Zouth Atelier',
        'tagline' => 'Colecao exclusiva',
        'description' => 'Detalhes que transformam vitrines.',
        'primary_color' => '#111111',
        'secondary_color' => '#222222',
        'accent_color' => '#333333',
        'background_color' => '#f4f4f4',
        'font_family' => 'fraunces',
        'public_link_active' => true,
    ];

    $response = $this->actingAs($this->user)
        ->put(route('manufacturer.catalog-settings.update'), $payload);

    $response->assertRedirect();

    $this->assertDatabaseHas('catalog_settings', [
        'manufacturer_id' => $this->manufacturer->id,
        'brand_name' => 'Zouth Atelier',
        'primary_color' => '#111111',
        'font_family' => 'fraunces',
    ]);
});

it('uploads a catalog logo', function () {
    Storage::fake('public');

    $response = $this->actingAs($this->user)->post(
        route('manufacturer.catalog-settings.logo'),
        ['logo' => UploadedFile::fake()->image('logo.png')]
    );

    $response->assertRedirect();

    $setting = CatalogSetting::first();
    expect($setting)->not->toBeNull();

    Storage::disk('public')->assertExists($setting->logo_path);
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

    attachCatalogVariation($redProduct, $color, 'Vermelho', 0);

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
        ->toBe(['Azul', 'Vermelho']);
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
        'font_family' => 'fraunces',
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
        ->and($setting->font_family)->toBe('space-grotesk');
});
