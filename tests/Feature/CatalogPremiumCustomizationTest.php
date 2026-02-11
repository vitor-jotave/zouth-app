<?php

use App\Models\CatalogSetting;
use App\Models\Manufacturer;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->withoutVite();
    Storage::fake('public');

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

it('allows manufacturer to save layout preset settings', function () {
    CatalogSetting::create([
        'manufacturer_id' => $this->manufacturer->id,
        ...CatalogSetting::defaults($this->manufacturer->name),
    ]);

    $response = $this->actingAs($this->user)->put(route('manufacturer.catalog-settings.update'), [
        'brand_name' => 'Test Brand',
        'tagline' => 'Test',
        'description' => 'Test',
        'primary_color' => '#0F766E',
        'secondary_color' => '#0F172A',
        'accent_color' => '#F97316',
        'background_color' => '#F8FAFC',
        'font_family' => 'space-grotesk',
        'public_link_active' => true,
        'layout_preset' => 'boutique',
        'layout_density' => 'compact',
        'card_style' => 'flat',
    ]);

    $response->assertRedirect();

    $setting = CatalogSetting::where('manufacturer_id', $this->manufacturer->id)->first();
    expect($setting->layout_preset)->toBe('boutique');
    expect($setting->layout_density)->toBe('compact');
    expect($setting->card_style)->toBe('flat');
});

it('validates layout preset enum values', function () {
    CatalogSetting::create([
        'manufacturer_id' => $this->manufacturer->id,
        ...CatalogSetting::defaults($this->manufacturer->name),
    ]);

    $response = $this->actingAs($this->user)->put(route('manufacturer.catalog-settings.update'), [
        'brand_name' => 'Test Brand',
        'primary_color' => '#0F766E',
        'secondary_color' => '#0F172A',
        'accent_color' => '#F97316',
        'background_color' => '#F8FAFC',
        'font_family' => 'space-grotesk',
        'public_link_active' => true,
        'layout_preset' => 'invalid-preset',
    ]);

    $response->assertInvalid('layout_preset');
});

it('allows background image upload', function () {
    CatalogSetting::create([
        'manufacturer_id' => $this->manufacturer->id,
        ...CatalogSetting::defaults($this->manufacturer->name),
    ]);

    $file = UploadedFile::fake()->image('background.jpg', 1920, 1080);

    $response = $this->actingAs($this->user)->post(route('manufacturer.catalog-settings.background'), [
        'background_image' => $file,
    ]);

    $response->assertRedirect();

    $setting = CatalogSetting::where('manufacturer_id', $this->manufacturer->id)->first();
    expect($setting->background_image_path)->not->toBeNull();
    Storage::disk('public')->assertExists($setting->background_image_path);
});

it('allows background image removal', function () {
    $file = UploadedFile::fake()->image('background.jpg');
    $path = $file->store('catalog-backgrounds', 'public');

    CatalogSetting::create([
        'manufacturer_id' => $this->manufacturer->id,
        'background_image_path' => $path,
        ...CatalogSetting::defaults($this->manufacturer->name),
    ]);

    $response = $this->actingAs($this->user)->delete(route('manufacturer.catalog-settings.background.destroy'));

    $response->assertRedirect();

    $setting = CatalogSetting::where('manufacturer_id', $this->manufacturer->id)->first();
    expect($setting->background_image_path)->toBeNull();
    Storage::disk('public')->assertMissing($path);
});

it('validates background mode enum values', function () {
    CatalogSetting::create([
        'manufacturer_id' => $this->manufacturer->id,
        ...CatalogSetting::defaults($this->manufacturer->name),
    ]);

    $response = $this->actingAs($this->user)->put(route('manufacturer.catalog-settings.update'), [
        'brand_name' => 'Test Brand',
        'primary_color' => '#0F766E',
        'secondary_color' => '#0F172A',
        'accent_color' => '#F97316',
        'background_color' => '#F8FAFC',
        'font_family' => 'space-grotesk',
        'public_link_active' => true,
        'background_mode' => 'invalid-mode',
    ]);

    $response->assertInvalid('background_mode');
});

it('validates pattern id enum values', function () {
    CatalogSetting::create([
        'manufacturer_id' => $this->manufacturer->id,
        ...CatalogSetting::defaults($this->manufacturer->name),
    ]);

    $response = $this->actingAs($this->user)->put(route('manufacturer.catalog-settings.update'), [
        'brand_name' => 'Test Brand',
        'primary_color' => '#0F766E',
        'secondary_color' => '#0F172A',
        'accent_color' => '#F97316',
        'background_color' => '#F8FAFC',
        'font_family' => 'space-grotesk',
        'public_link_active' => true,
        'pattern_id' => 'invalid-pattern',
    ]);

    $response->assertInvalid('pattern_id');
});

it('validates opacity ranges', function () {
    CatalogSetting::create([
        'manufacturer_id' => $this->manufacturer->id,
        ...CatalogSetting::defaults($this->manufacturer->name),
    ]);

    $response = $this->actingAs($this->user)->put(route('manufacturer.catalog-settings.update'), [
        'brand_name' => 'Test Brand',
        'primary_color' => '#0F766E',
        'secondary_color' => '#0F172A',
        'accent_color' => '#F97316',
        'background_color' => '#F8FAFC',
        'font_family' => 'space-grotesk',
        'public_link_active' => true,
        'background_image_opacity' => 150,
    ]);

    $response->assertInvalid('background_image_opacity');
});

it('allows saving sections configuration', function () {
    CatalogSetting::create([
        'manufacturer_id' => $this->manufacturer->id,
        ...CatalogSetting::defaults($this->manufacturer->name),
    ]);

    $sections = [
        [
            'type' => 'hero',
            'enabled' => true,
            'props' => ['show_logo' => true, 'align' => 'center'],
        ],
        [
            'type' => 'product_grid',
            'enabled' => true,
            'props' => ['columns_desktop' => 4],
        ],
    ];

    $response = $this->actingAs($this->user)->put(route('manufacturer.catalog-settings.update'), [
        'brand_name' => 'Test Brand',
        'primary_color' => '#0F766E',
        'secondary_color' => '#0F172A',
        'accent_color' => '#F97316',
        'background_color' => '#F8FAFC',
        'font_family' => 'space-grotesk',
        'public_link_active' => true,
        'sections' => $sections,
    ]);

    $response->assertRedirect();

    $setting = CatalogSetting::where('manufacturer_id', $this->manufacturer->id)->first();
    expect($setting->sections)->toBeArray();
    expect($setting->sections)->toHaveCount(2);
});
