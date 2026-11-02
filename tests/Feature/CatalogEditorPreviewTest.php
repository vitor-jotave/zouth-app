<?php

use App\Models\CatalogSetting;
use App\Models\CatalogVisit;
use App\Models\Manufacturer;
use App\Models\OrderRule;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\ProductVariantStock;
use App\Models\ProductVariation;
use App\Models\User;
use App\Models\VariationType;
use App\Models\VariationValue;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
    $this->manufacturer = Manufacturer::factory()->create();
    $this->user = User::factory()->create([
        'user_type' => 'manufacturer_user',
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);
    $this->manufacturer->users()->attach($this->user, ['role' => 'owner', 'status' => 'active']);
    $this->setting = CatalogSetting::query()->create([
        ...CatalogSetting::defaults($this->manufacturer->name),
        'manufacturer_id' => $this->manufacturer->id,
    ]);
});

it('protects the catalog editor preview with authentication and catalog permission', function () {
    $this->get(route('manufacturer.catalog-settings.preview'))->assertRedirect(route('login'));

    $staff = User::factory()->create([
        'user_type' => 'manufacturer_user',
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);
    $this->manufacturer->users()->attach($staff, [
        'role' => 'staff',
        'status' => 'active',
        'capabilities' => ['collection.manage'],
    ]);

    $this->actingAs($staff)->get(route('manufacturer.catalog-settings.preview'))->assertForbidden();

    $this->manufacturer->users()->updateExistingPivot($staff->id, ['capabilities' => ['catalog.manage']]);
    $this->actingAs($staff->fresh())->get(route('manufacturer.catalog-settings.preview'))->assertSuccessful();
});

it('previews a paused public link without publishing or recording a visit', function () {
    $this->setting->update(['public_link_active' => false]);
    $before = $this->setting->fresh()->getAttributes();

    $this->actingAs($this->user)->get(route('manufacturer.catalog-settings.preview'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('public/catalog')
            ->where('preview_mode', true)
            ->where('catalog_settings.public_link_active', false)
            ->where('manufacturer.id', $this->manufacturer->id));

    expect(CatalogVisit::query()->count())->toBe(0)
        ->and($this->setting->fresh()->getAttributes())->toBe($before);

    $this->get(route('public.catalog.show', $this->setting->public_token))->assertNotFound();
});

it('uses the public renderer contract with all real products and separate combos', function () {
    Product::factory()->forManufacturer($this->manufacturer)->withoutCategory()->count(30)->create();
    Product::factory()->forManufacturer($this->manufacturer)->withoutCategory()->create([
        'product_type' => 'combo', 'name' => 'Composição coordenada',
    ]);
    Product::factory()->forManufacturer($this->manufacturer)->withoutCategory()->create(['is_active' => false]);

    $this->actingAs($this->user)->get(route('manufacturer.catalog-settings.preview', ['search' => 'ignored', 'page' => 99]))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('public/catalog')
            ->has('products.data', 30)
            ->where('products.meta.total', 30)
            ->where('products.meta.current_page', 1)
            ->where('products.meta.last_page', 1)
            ->has('combos', 1)
            ->where('combos.0.name', 'Composição coordenada')
            ->where('filters.search', ''));

    $this->get(route('public.catalog.show', $this->setting->public_token))
        ->assertInertia(fn (Assert $page) => $page
            ->where('preview_mode', false)
            ->has('products.data', 24)
            ->where('products.meta.last_page', 2));
});

it('cannot preview another manufacturers collection through request parameters', function () {
    $other = Manufacturer::factory()->create();
    $otherSetting = CatalogSetting::query()->create([
        ...CatalogSetting::defaults($other->name), 'manufacturer_id' => $other->id,
    ]);
    Product::factory()->forManufacturer($this->manufacturer)->withoutCategory()->create(['name' => 'Peça da minha marca']);
    Product::factory()->forManufacturer($other)->withoutCategory()->create(['name' => 'Peça de outra marca']);
    OrderRule::factory()->create(['manufacturer_id' => $other->id]);

    $this->actingAs($this->user)->get(route('manufacturer.catalog-settings.preview', [
        'manufacturer_id' => $other->id, 'token' => $otherSetting->public_token,
    ]))->assertSuccessful()->assertInertia(fn (Assert $page) => $page
        ->where('manufacturer.id', $this->manufacturer->id)
        ->where('catalog_token', $this->setting->public_token)
        ->has('products.data', 1)
        ->where('products.data.0.name', 'Peça da minha marca')
        ->has('order_rules', 0));
});

it('supplies complete authenticated preview data while keeping public prices and rules private', function () {
    $this->setting->update(['hide_prices' => true, 'allow_orders_without_stock' => false]);
    $category = ProductCategory::factory()->create(['manufacturer_id' => $this->manufacturer->id]);
    $product = Product::factory()->forManufacturer($this->manufacturer)->create([
        'product_category_id' => $category->id, 'price_cents' => 12300,
    ]);
    $type = VariationType::factory()->create(['manufacturer_id' => $this->manufacturer->id, 'name' => 'Tamanho']);
    VariationValue::factory()->create(['variation_type_id' => $type->id, 'value' => 'P']);
    VariationValue::factory()->create(['variation_type_id' => $type->id, 'value' => 'G']);
    ProductVariation::query()->create(['product_id' => $product->id, 'variation_type_id' => $type->id]);
    ProductVariantStock::factory()->create([
        'product_id' => $product->id, 'variation_key' => ['Tamanho' => 'P'], 'quantity' => 0, 'price_cents' => 12500,
    ]);
    ProductVariantStock::factory()->create([
        'product_id' => $product->id, 'variation_key' => ['Tamanho' => 'G'], 'quantity' => 4, 'price_cents' => 12800,
    ]);
    OrderRule::factory()->create(['manufacturer_id' => $this->manufacturer->id]);

    $this->actingAs($this->user)->get(route('manufacturer.catalog-settings.preview'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('products.data.0.price_cents', 12300)
            ->has('products.data.0.variations.0.values', 2)
            ->has('products.data.0.variant_stocks.0.price_cents')
            ->has('filter_options.variation_types.0.values', 2)
            ->has('order_rules', 1));

    $this->get(route('public.catalog.show', ['token' => $this->setting->public_token, 'preview_mode' => true]))
        ->assertInertia(fn (Assert $page) => $page
            ->where('preview_mode', false)
            ->missing('products.data.0.price_cents')
            ->missing('products.data.0.variant_stocks.0.price_cents')
            ->has('products.data.0.variations.0.values', 1)
            ->has('filter_options.variation_types.0.values', 1)
            ->has('order_rules', 0));
});

it('shares the same saved settings products combos and filter options between preview and public', function () {
    Product::factory()->forManufacturer($this->manufacturer)->withoutCategory()->count(3)->create();
    Product::factory()->forManufacturer($this->manufacturer)->withoutCategory()->create(['product_type' => 'combo']);
    $preview = $this->actingAs($this->user)->get(route('manufacturer.catalog-settings.preview'))->assertSuccessful();
    $public = $this->get(route('public.catalog.show', $this->setting->public_token))->assertSuccessful();

    foreach (['manufacturer', 'catalog_settings', 'products.data', 'combos', 'filter_options', 'order_rules', 'whatsapp_checkout'] as $key) {
        expect($preview->inertiaProps($key))->toEqual($public->inertiaProps($key));
    }
});
