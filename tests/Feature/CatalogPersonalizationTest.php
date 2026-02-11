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
