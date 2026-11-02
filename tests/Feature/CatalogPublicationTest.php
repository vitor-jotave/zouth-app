<?php

use App\Models\CatalogSetting;
use App\Models\Manufacturer;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->withoutVite();
    Storage::fake('public');
    config(['filesystems.catalog_media_disk' => 'public']);
    $this->manufacturer = Manufacturer::factory()->create(['is_active' => true]);
    $this->user = User::factory()->create([
        'user_type' => 'manufacturer_user',
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);
    $this->manufacturer->users()->attach($this->user->id, ['role' => 'owner', 'status' => 'active']);
    $this->setting = CatalogSetting::create([
        'manufacturer_id' => $this->manufacturer->id,
        ...CatalogSetting::defaults('Marca publicada'),
        'logo_path' => 'previous/logo.png',
        'background_image_path' => 'previous/background.jpg',
        'cover_image_path' => 'previous/cover.jpg',
        'cover_thumbnail_path' => 'previous/thumbnail.jpg',
    ]);
    foreach (['logo.png', 'background.jpg', 'cover.jpg', 'thumbnail.jpg'] as $name) {
        Storage::disk('public')->put("previous/{$name}", "original-{$name}");
    }
    $this->payload = [
        '_method' => 'put',
        'brand_name' => 'Marca revisada',
        'primary_color' => '#112233',
        'secondary_color' => '#223344',
        'accent_color' => '#ff4d3d',
        'background_color' => '#f6f4f0',
        'font_family' => 'manrope',
        'public_link_active' => true,
    ];
});

it('publishes all three images and appearance in one save', function () {
    $logo = UploadedFile::fake()->image('logo.png');
    $this->actingAs($this->user)->post(route('manufacturer.catalog-settings.update'), [
        ...$this->payload,
        'logo' => $logo,
        'background_image' => UploadedFile::fake()->image('background.jpg'),
        'cover_image' => UploadedFile::fake()->image('cover.jpg', 1200, 800),
    ])->assertRedirect()->assertSessionHasNoErrors();

    $setting = $this->setting->fresh();
    expect($setting->brand_name)->toBe('Marca revisada');
    Storage::disk('public')->assertExists([$setting->logo_path, $setting->background_image_path, $setting->cover_image_path, $setting->cover_thumbnail_path]);
    Storage::disk('public')->assertMissing(['previous/logo.png', 'previous/background.jpg', 'previous/cover.jpg', 'previous/thumbnail.jpg']);
    expect(Storage::disk('public')->get($setting->logo_path))->toBe($logo->get());
});

it('preserves every published image when media fields are omitted or empty', function (bool $emptyFiles) {
    $payload = $this->payload;
    if ($emptyFiles) {
        $payload += ['logo' => null, 'background_image' => null, 'cover_image' => null, 'remove_logo' => false, 'remove_background_image' => false, 'remove_cover_image' => false];
    }
    $this->actingAs($this->user)->post(route('manufacturer.catalog-settings.update'), $payload)->assertSessionHasNoErrors();

    expect($this->setting->fresh()->only(['logo_path', 'background_image_path', 'cover_image_path', 'cover_thumbnail_path']))->toBe($this->setting->only(['logo_path', 'background_image_path', 'cover_image_path', 'cover_thumbnail_path']));
    expect(Storage::disk('public')->allFiles())->toHaveCount(4);
})->with([true, false]);

it('removes only the explicitly selected media on publication', function (string $field, string $path) {
    $this->actingAs($this->user)->post(route('manufacturer.catalog-settings.update'), [
        ...$this->payload, "remove_{$field}" => true,
    ])->assertSessionHasNoErrors();

    expect($this->setting->fresh()->getAttribute($path))->toBeNull();
    Storage::disk('public')->assertMissing($this->setting->getAttribute($path));
    foreach (['logo_path', 'background_image_path', 'cover_image_path'] as $otherPath) {
        if ($path !== $otherPath) {
            expect($this->setting->fresh()->getAttribute($otherPath))->toBe($this->setting->getAttribute($otherPath));
            Storage::disk('public')->assertExists($this->setting->getAttribute($otherPath));
        }
    }
    if ($field === 'cover_image') {
        expect($this->setting->fresh()->cover_thumbnail_path)->toBeNull();
        Storage::disk('public')->assertMissing('previous/thumbnail.jpg');
    }
})->with([
    ['logo', 'logo_path'], ['background_image', 'background_image_path'], ['cover_image', 'cover_image_path'],
]);

it('rejects uploading and removing the same image together', function (string $field) {
    $this->actingAs($this->user)->post(route('manufacturer.catalog-settings.update'), [
        ...$this->payload, $field => UploadedFile::fake()->image('new.png'), "remove_{$field}" => true,
    ])->assertSessionHasErrors($field);

    expect($this->setting->fresh()->brand_name)->toBe('Marca publicada');
    expect(Storage::disk('public')->allFiles())->toHaveCount(4);
})->with(['logo', 'background_image', 'cover_image']);

it('rejects invalid media without publishing other valid changes', function (string $field, int $maximum) {
    $this->actingAs($this->user)->post(route('manufacturer.catalog-settings.update'), [
        ...$this->payload,
        'logo' => UploadedFile::fake()->image('valid.png'),
        $field => UploadedFile::fake()->image('too-large.jpg')->size($maximum + 1),
    ])->assertSessionHasErrors($field);

    expect($this->setting->fresh()->brand_name)->toBe('Marca publicada');
    expect(Storage::disk('public')->allFiles())->toHaveCount(4);
})->with([['logo', 2048], ['background_image', 5120], ['cover_image', 8192]]);

it('cleans newly staged images and keeps published images when a later upload fails', function () {
    $disk = Storage::disk('public');
    $failing = Mockery::mock($disk);
    $failing->shouldReceive('putFileAs')->andReturnUsing(function (...$arguments) use ($disk) {
        return str_contains($arguments[0], '/backgrounds') ? false : $disk->putFileAs(...$arguments);
    });
    Storage::set('public', $failing);

    $this->actingAs($this->user)->post(route('manufacturer.catalog-settings.update'), [
        ...$this->payload,
        'logo' => UploadedFile::fake()->image('new-logo.png'),
        'background_image' => UploadedFile::fake()->image('new-background.png'),
    ])->assertSessionHasErrors('catalog_publication');

    expect($this->setting->fresh()->brand_name)->toBe('Marca publicada');
    expect($disk->allFiles())->toHaveCount(4);
    $disk->assertExists(['previous/logo.png', 'previous/background.jpg', 'previous/cover.jpg', 'previous/thumbnail.jpg']);
});

it('rolls back publication and cleans every new image when the database rejects saving', function (bool $throws) {
    CatalogSetting::updating(function (CatalogSetting $setting) use ($throws): bool {
        if ($setting->brand_name === 'Marca revisada') {
            if ($throws) {
                throw new RuntimeException('Simulated persistence failure');
            }

            return false;
        }

        return true;
    });
    $this->actingAs($this->user)->post(route('manufacturer.catalog-settings.update'), [
        ...$this->payload,
        'logo' => UploadedFile::fake()->image('new-logo.png'),
        'background_image' => UploadedFile::fake()->image('new-background.png'),
        'cover_image' => UploadedFile::fake()->image('new-cover.png'),
    ])->assertSessionHasErrors('catalog_publication');

    expect($this->setting->fresh()->brand_name)->toBe('Marca publicada');
    expect(Storage::disk('public')->allFiles())->toHaveCount(4);
    Storage::disk('public')->assertExists(['previous/logo.png', 'previous/background.jpg', 'previous/cover.jpg', 'previous/thumbnail.jpg']);
})->with([true, false]);

it('keeps a successful publication when obsolete file cleanup fails', function () {
    $disk = Storage::disk('public');
    $failing = Mockery::mock($disk);
    $failing->shouldReceive('delete')->andThrow(new RuntimeException('Simulated cleanup failure'));
    Storage::set('public', $failing);

    $this->actingAs($this->user)->post(route('manufacturer.catalog-settings.update'), [
        ...$this->payload, 'logo' => UploadedFile::fake()->image('new.png'),
    ])->assertSessionHasNoErrors();

    $setting = $this->setting->fresh();
    expect($setting->brand_name)->toBe('Marca revisada')->and($setting->logo_path)->not->toBe('previous/logo.png');
    $disk->assertExists($setting->logo_path);
});

it('preserves tenant ownership and ignores client-supplied stored paths', function () {
    $other = CatalogSetting::factory()->create();
    $other->refresh();
    $this->actingAs($this->user)->post(route('manufacturer.catalog-settings.update'), [
        ...$this->payload,
        'manufacturer_id' => $other->manufacturer_id,
        'logo_path' => 'somebody-elses-logo.png',
        'public_token' => 'tampered',
        'logo' => UploadedFile::fake()->image('new.png'),
    ])->assertSessionHasNoErrors();

    expect($this->setting->fresh()->manufacturer_id)->toBe($this->manufacturer->id)
        ->and($this->setting->fresh()->public_token)->toBe($this->setting->public_token)
        ->and($this->setting->fresh()->logo_path)->toStartWith("manufacturers/{$this->manufacturer->id}/catalog/logos/")
        ->and($other->fresh()->getAttributes())->toBe($other->getAttributes());
});

it('requires catalog permission for publication', function () {
    $this->manufacturer->users()->updateExistingPivot($this->user->id, ['role' => 'staff', 'capabilities' => ['collection.manage']]);
    $this->actingAs($this->user)->post(route('manufacturer.catalog-settings.update'), $this->payload)->assertForbidden();
    expect($this->setting->fresh()->brand_name)->toBe('Marca publicada');
});

it('restores appearance while preserving commercial decisions and published media', function () {
    $this->setting->update(['hide_prices' => true, 'allow_orders_without_stock' => true, 'public_link_active' => false]);
    $before = $this->setting->only(['hide_prices', 'allow_orders_without_stock', 'public_link_active', 'logo_path', 'background_image_path', 'cover_image_path', 'cover_thumbnail_path', 'public_token']);

    $this->actingAs($this->user)->post(route('manufacturer.catalog-settings.reset-defaults'))->assertSessionHasNoErrors();

    expect($this->setting->fresh()->only(array_keys($before)))->toBe($before);
    expect(Storage::disk('public')->allFiles())->toHaveCount(4);
    $this->get(route('manufacturer.catalog-settings.index'))->assertInertia(fn ($page) => $page
        ->has('appearance_defaults.sections', 3)
        ->missing('appearance_defaults.hide_prices')
        ->missing('appearance_defaults.allow_orders_without_stock')
        ->missing('appearance_defaults.public_link_active')
        ->missing('appearance_defaults.logo_path')
        ->missing('appearance_defaults.public_token'));
});

it('keeps legacy media uploads safe when a replacement cannot be stored', function (string $route, string $field) {
    $disk = Storage::disk('public');
    $failing = Mockery::mock($disk);
    $failing->shouldReceive('putFileAs')->andReturn(false);
    Storage::set('public', $failing);

    $this->actingAs($this->user)->post(route($route), [$field => UploadedFile::fake()->image('new.png')])->assertSessionHasErrors('catalog_publication');

    $disk->assertExists(['previous/logo.png', 'previous/background.jpg']);
})->with([
    ['manufacturer.catalog-settings.logo', 'logo'],
    ['manufacturer.catalog-settings.background', 'background_image'],
]);

it('does not delete published media when a legacy removal fails to persist', function (string $route) {
    CatalogSetting::updating(function (): void {
        throw new RuntimeException('Simulated removal persistence failure');
    });

    $this->actingAs($this->user)->delete(route($route))->assertSessionHasErrors('catalog_publication');

    expect($this->setting->fresh()->only(['logo_path', 'background_image_path', 'cover_image_path', 'cover_thumbnail_path']))->toBe($this->setting->only(['logo_path', 'background_image_path', 'cover_image_path', 'cover_thumbnail_path']));
    Storage::disk('public')->assertExists(['previous/logo.png', 'previous/background.jpg', 'previous/cover.jpg', 'previous/thumbnail.jpg']);
})->with([
    'manufacturer.catalog-settings.logo.destroy',
    'manufacturer.catalog-settings.background.destroy',
    'manufacturer.catalog-settings.cover.destroy',
]);

it('persists intentionally empty cover text in both preview and public contracts', function () {
    $sections = CatalogSetting::defaultSections();
    $sections[0]['props'] = [
        ...$sections[0]['props'],
        'headline' => '',
        'headline_fallback' => false,
        'subtitle' => '',
        'subtitle_fallback' => false,
        'eyebrow' => '',
        'eyebrow_fallback' => false,
        'cta_text' => '',
        'cta_text_fallback' => false,
    ];
    $this->actingAs($this->user)->post(route('manufacturer.catalog-settings.update'), [
        ...$this->payload,
        'tagline' => 'Slogan antigo',
        'description' => 'Descrição antiga',
        'sections' => $sections,
    ])->assertSessionHasNoErrors();

    foreach ([route('manufacturer.catalog-settings.preview'), route('public.catalog.show', ['token' => $this->setting->public_token])] as $url) {
        $this->get($url)->assertInertia(fn ($page) => $page
            ->where('catalog_settings.sections.0.props.headline', null)
            ->where('catalog_settings.sections.0.props.headline_fallback', false)
            ->where('catalog_settings.sections.0.props.subtitle', null)
            ->where('catalog_settings.sections.0.props.subtitle_fallback', false)
            ->where('catalog_settings.sections.0.props.eyebrow', null)
            ->where('catalog_settings.sections.0.props.eyebrow_fallback', false)
            ->where('catalog_settings.sections.0.props.cta_text', null)
            ->where('catalog_settings.sections.0.props.cta_text_fallback', false)
            ->where('catalog_settings.tagline', 'Slogan antigo')
            ->where('catalog_settings.description', 'Descrição antiga'));
    }
});

it('validates the cover text fallback flags', function (string $field) {
    $sections = CatalogSetting::defaultSections();
    $sections[0]['props'][$field] = 'invalid';
    $this->actingAs($this->user)->post(route('manufacturer.catalog-settings.update'), [
        ...$this->payload, 'sections' => $sections,
    ])->assertSessionHasErrors("sections.0.props.{$field}");
    expect($this->setting->fresh()->brand_name)->toBe('Marca publicada');
})->with(['headline_fallback', 'subtitle_fallback', 'eyebrow_fallback', 'cta_text_fallback']);

it('normalizes multipart section booleans before saving and rendering', function () {
    $sections = CatalogSetting::defaultSections();
    $sections[0]['props']['headline_fallback'] = '0';
    $sections[0]['props']['subtitle_fallback'] = '0';
    $sections[0]['props']['eyebrow_fallback'] = '0';
    $sections[0]['props']['cta_text_fallback'] = '0';
    $sections[0]['props']['show_cta'] = '0';
    $sections[0]['props']['show_product_count'] = '1';
    $sections[1]['enabled'] = '0';
    $sections[2]['props']['show_price'] = '0';
    $sections[2]['props']['show_stock'] = '0';
    $sections[2]['props']['show_quantity_selector'] = '0';
    $this->actingAs($this->user)->post(route('manufacturer.catalog-settings.update'), [
        ...$this->payload, 'sections' => $sections,
        'logo' => UploadedFile::fake()->image('logo.png'),
    ])->assertSessionHasNoErrors();

    $saved = $this->setting->fresh()->sections;
    expect($saved[0]['props']['headline_fallback'])->toBeFalse()
        ->and($saved[0]['props']['subtitle_fallback'])->toBeFalse()
        ->and($saved[0]['props']['eyebrow_fallback'])->toBeFalse()
        ->and($saved[0]['props']['cta_text_fallback'])->toBeFalse()
        ->and($saved[0]['props']['show_cta'])->toBeFalse()
        ->and($saved[0]['props']['show_product_count'])->toBeTrue()
        ->and($saved[1]['enabled'])->toBeFalse()
        ->and($saved[2]['props']['show_price'])->toBeFalse()
        ->and($saved[2]['props']['show_stock'])->toBeFalse()
        ->and($saved[2]['props']['show_quantity_selector'])->toBeFalse();
});

it('normalizes previously saved multipart booleans consistently in editor preview and public catalog', function () {
    $sections = CatalogSetting::defaultSections();
    $sections[0]['enabled'] = '1';
    $sections[0]['props']['headline_fallback'] = '0';
    $sections[0]['props']['subtitle_fallback'] = '0';
    $sections[1]['enabled'] = '0';
    $sections[2]['props']['show_stock'] = '0';
    $this->setting->update(['sections' => $sections]);

    foreach ([route('manufacturer.catalog-settings.index'), route('manufacturer.catalog-settings.preview'), route('public.catalog.show', ['token' => $this->setting->public_token])] as $url) {
        $this->actingAs($this->user)->get($url)->assertInertia(fn ($page) => $page
            ->where('catalog_settings.sections.0.enabled', true)
            ->where('catalog_settings.sections.0.props.headline_fallback', false)
            ->where('catalog_settings.sections.0.props.subtitle_fallback', false)
            ->where('catalog_settings.sections.1.enabled', false)
            ->where('catalog_settings.sections.2.props.show_stock', false));
    }
});

it('still rejects malformed section booleans after multipart normalization', function () {
    $sections = CatalogSetting::defaultSections();
    $sections[0]['enabled'] = 'unexpected';
    $sections[2]['props']['show_stock'] = 'unexpected';

    $this->actingAs($this->user)->post(route('manufacturer.catalog-settings.update'), [
        ...$this->payload, 'sections' => $sections,
    ])->assertSessionHasErrors(['sections.0.enabled', 'sections.2.props.show_stock']);
    expect($this->setting->fresh()->brand_name)->toBe('Marca publicada');
});
