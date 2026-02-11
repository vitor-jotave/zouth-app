<?php

use App\Models\CatalogSetting;
use App\Models\Manufacturer;
use App\Models\User;
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
    $setting = CatalogSetting::create([
        'manufacturer_id' => $this->manufacturer->id,
        'brand_name' => 'Zouth Atelier',
        'public_token' => 'public-token',
        'public_link_active' => true,
    ]);

    $response = $this->get(route('public.catalog.show', ['token' => $setting->public_token]));

    $response->assertOk();

    $this->assertDatabaseHas('catalog_visits', [
        'manufacturer_id' => $this->manufacturer->id,
        'public_token' => 'public-token',
    ]);
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
