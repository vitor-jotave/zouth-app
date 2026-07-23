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
    $this->manufacturer->users()->attach($this->user->id, [
        'role' => 'owner',
        'status' => 'active',
    ]);
});

it('keeps the catalog studio controls accessible while the preview scrolls', function () {
    $studio = file_get_contents(resource_path('js/pages/manufacturer/catalog-settings/index.tsx'));

    expect($studio)
        ->toMatch('/data-testid="catalog-studio-structure"[^>]+xl:sticky[^>]+xl:top-0[^>]+xl:max-h-svh[^>]+xl:overflow-y-auto/s')
        ->toMatch('/data-testid="catalog-studio-preview-toolbar"[^>]+xl:sticky[^>]+xl:top-0[^>]+xl:z-30/s')
        ->toMatch('/data-testid="catalog-studio-inspector"[^>]+xl:sticky[^>]+xl:top-0[^>]+xl:max-h-svh[^>]+xl:overflow-y-auto/s');
});

it('renders the desktop preview at the same canonical width as the public catalog', function () {
    $studio = file_get_contents(resource_path('js/pages/manufacturer/catalog-settings/index.tsx'));

    expect($studio)
        ->toContain("const previewCanvasWidth = viewport === 'mobile' ? 390 : 1280")
        ->toContain('data-testid="catalog-preview-stage"')
        ->toContain('width: `${previewCanvasWidth}px`')
        ->toContain('zoom: previewScale');
});

it('reveals the section and field responsible for catalog validation errors', function () {
    $studio = file_get_contents(resource_path('js/pages/manufacturer/catalog-settings/index.tsx'));

    expect($studio)
        ->toContain('function panelForError(')
        ->toContain('guideToFirstError')
        ->toContain('data-catalog-error')
        ->toContain('PanelErrorBadge')
        ->toContain('Ir para o primeiro campo')
        ->toContain("settings.layout_density === 'compact' ? 'compact' : 'comfortable'")
        ->toContain("settings.card_style === 'flat' ? 'flat' : 'soft'");
});

it('places public catalog filters beside the collection navigation without repeated headings', function () {
    $catalog = file_get_contents(resource_path('js/pages/public/catalog.tsx'));

    expect($catalog)
        ->toContain('data-testid="catalog-collection-navigation"')
        ->toContain('trailingAction={')
        ->not->toContain('Descubra')
        ->not->toContain('Seleção da marca')
        ->not->toContain('{collectionsTitle}')
        ->not->toContain('{productGridTitle}');
});

it('keeps the catalog logo inside the shared hero surface', function () {
    $hero = file_get_contents(resource_path('js/components/catalog-hero.tsx'));
    $preview = file_get_contents(resource_path('js/components/catalog-preview.tsx'));
    $catalog = file_get_contents(resource_path('js/pages/public/catalog.tsx'));

    expect($hero)
        ->toContain('data-testid="catalog-hero-surface"')
        ->toContain('data-testid="catalog-brand-bar"')
        ->toMatch('/data-testid="catalog-hero-surface".*data-testid="catalog-brand-bar"/s')
        ->toContain('brandReserve')
        ->and($preview)
        ->toContain('<CatalogHero')
        ->and($catalog)
        ->toContain('<CatalogHero');
});

it('uses the same explicit campaign image rule in the studio preview and public catalog', function () {
    $theming = file_get_contents(resource_path('js/lib/catalog-theming.ts'));
    $preview = file_get_contents(resource_path('js/components/catalog-preview.tsx'));
    $catalog = file_get_contents(resource_path('js/pages/public/catalog.tsx'));
    $studio = file_get_contents(resource_path('js/pages/manufacturer/catalog-settings/index.tsx'));

    expect($theming)
        ->toContain('export function catalogCoverImageUrl(')
        ->and($preview)
        ->toContain('catalogCoverImageUrl(settings)')
        ->not->toContain('heroProduct?.primary_image')
        ->and($catalog)
        ->toContain('catalogCoverImageUrl(settings)')
        ->not->toContain('heroProduct?.primary_image')
        ->and($studio)
        ->toContain('Sem ela, a capa permanece')
        ->not->toContain('usamos a primeira');
});

it('uses the same campaign image resizing in the studio preview and public catalog', function () {
    $theming = file_get_contents(resource_path('js/lib/catalog-theming.ts'));
    $hero = file_get_contents(resource_path('js/components/catalog-hero.tsx'));
    $preview = file_get_contents(resource_path('js/components/catalog-preview.tsx'));
    $catalog = file_get_contents(resource_path('js/pages/public/catalog.tsx'));
    $studio = file_get_contents(resource_path('js/pages/manufacturer/catalog-settings/index.tsx'));

    expect($theming)
        ->toContain('export function catalogCoverImageStyle(')
        ->toContain("fit === 'manual'")
        ->and($hero)
        ->toContain('catalogCoverImageStyle(')
        ->and($preview)
        ->toContain('<CatalogHero')
        ->and($catalog)
        ->toContain('<CatalogHero')
        ->and($studio)
        ->toContain('Como a foto ocupa a capa')
        ->toContain('Tamanho manual')
        ->toContain('Tamanho da imagem');
});

it('keeps one flexible catalog base while saving presentation choices', function () {
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
        'font_family' => 'manrope',
        'public_link_active' => true,
        'layout_preset' => 'minimal',
        'layout_density' => 'compact',
        'card_style' => 'flat',
    ]);

    $response->assertRedirect();

    $setting = CatalogSetting::where('manufacturer_id', $this->manufacturer->id)->first();
    expect($setting->layout_preset)->toBe('minimal');
    expect($setting->font_family)->toBe('manrope');
    expect($setting->layout_density)->toBe('compact');
    expect($setting->card_style)->toBe('flat');
});

it('rejects catalog templates in favor of the flexible catalog base', function (string $preset) {
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
        'layout_preset' => $preset,
    ]);

    $response->assertInvalid('layout_preset');
})->with([
    'legacy playful template' => 'playful',
    'legacy boutique template' => 'boutique',
    'unknown template' => 'invalid-preset',
]);

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

it('optimizes and stores an editorial cover with its focal point', function () {
    $response = $this->actingAs($this->user)->post(route('manufacturer.catalog-settings.cover'), [
        'cover_image' => UploadedFile::fake()->image('campaign-cover.jpg', 1600, 900),
        'cover_image_focal_x' => 34,
        'cover_image_focal_y' => 61,
    ]);

    $response->assertRedirect();

    $setting = CatalogSetting::where('manufacturer_id', $this->manufacturer->id)->firstOrFail();

    expect($setting->cover_image_path)
        ->toStartWith("manufacturers/{$this->manufacturer->id}/catalog/covers/")
        ->and($setting->cover_thumbnail_path)
        ->toStartWith("manufacturers/{$this->manufacturer->id}/catalog/covers/thumbnails/")
        ->and($setting->cover_image_focal_x)->toBe(34)
        ->and($setting->cover_image_focal_y)->toBe(61);

    Storage::disk('public')->assertExists($setting->cover_image_path);
    Storage::disk('public')->assertExists($setting->cover_thumbnail_path);
});

it('stores editorial covers on the configured catalog media disk', function () {
    Storage::fake('s3');
    config(['filesystems.catalog_media_disk' => 's3']);

    $response = $this->actingAs($this->user)->post(route('manufacturer.catalog-settings.cover'), [
        'cover_image' => UploadedFile::fake()->image('cover.jpg', 1200, 800),
    ]);

    $response->assertRedirect();

    $setting = CatalogSetting::where('manufacturer_id', $this->manufacturer->id)->firstOrFail();

    Storage::disk('s3')->assertExists($setting->cover_image_path);
    Storage::disk('s3')->assertExists($setting->cover_thumbnail_path);
    Storage::disk('public')->assertMissing($setting->cover_image_path);
    Storage::disk('public')->assertMissing($setting->cover_thumbnail_path);
});

it('stores a replacement before deleting the previous editorial cover', function () {
    $oldPath = "manufacturers/{$this->manufacturer->id}/catalog/covers/old.jpg";
    $oldThumbnailPath = "manufacturers/{$this->manufacturer->id}/catalog/covers/thumbnails/old.jpg";
    Storage::disk('public')->put($oldPath, 'old-cover');
    Storage::disk('public')->put($oldThumbnailPath, 'old-thumbnail');

    $setting = CatalogSetting::factory()->forManufacturer($this->manufacturer)->create([
        'cover_image_path' => $oldPath,
        'cover_thumbnail_path' => $oldThumbnailPath,
        'cover_image_focal_x' => 10,
        'cover_image_focal_y' => 20,
    ]);

    $response = $this->actingAs($this->user)->post(route('manufacturer.catalog-settings.cover'), [
        'cover_image' => UploadedFile::fake()->image('replacement.jpg', 1200, 800),
    ]);

    $response->assertRedirect();
    $setting->refresh();

    expect($setting->cover_image_path)->not->toBe($oldPath)
        ->and($setting->cover_thumbnail_path)->not->toBe($oldThumbnailPath)
        ->and($setting->cover_image_focal_x)->toBe(50)
        ->and($setting->cover_image_focal_y)->toBe(50);

    Storage::disk('public')->assertMissing($oldPath);
    Storage::disk('public')->assertMissing($oldThumbnailPath);
    Storage::disk('public')->assertExists($setting->cover_image_path);
    Storage::disk('public')->assertExists($setting->cover_thumbnail_path);
});

it('removes both editorial cover derivatives and resets its focal point', function () {
    $path = "manufacturers/{$this->manufacturer->id}/catalog/covers/current.jpg";
    $thumbnailPath = "manufacturers/{$this->manufacturer->id}/catalog/covers/thumbnails/current.jpg";
    Storage::disk('public')->put($path, 'cover');
    Storage::disk('public')->put($thumbnailPath, 'thumbnail');

    $setting = CatalogSetting::factory()->forManufacturer($this->manufacturer)->create([
        'cover_image_path' => $path,
        'cover_thumbnail_path' => $thumbnailPath,
        'cover_image_focal_x' => 12,
        'cover_image_focal_y' => 88,
    ]);

    $response = $this->actingAs($this->user)->delete(route('manufacturer.catalog-settings.cover.destroy'));

    $response->assertRedirect();
    $setting->refresh();

    expect($setting->cover_image_path)->toBeNull()
        ->and($setting->cover_thumbnail_path)->toBeNull()
        ->and($setting->cover_image_focal_x)->toBe(50)
        ->and($setting->cover_image_focal_y)->toBe(50);

    Storage::disk('public')->assertMissing($path);
    Storage::disk('public')->assertMissing($thumbnailPath);
});

it('validates editorial cover file type and focal point bounds', function () {
    $invalidFileResponse = $this->actingAs($this->user)->post(route('manufacturer.catalog-settings.cover'), [
        'cover_image' => UploadedFile::fake()->create('cover.pdf', 100, 'application/pdf'),
    ]);

    $invalidFileResponse->assertInvalid('cover_image');

    $invalidFocalResponse = $this->actingAs($this->user)->post(route('manufacturer.catalog-settings.cover'), [
        'cover_image' => UploadedFile::fake()->image('cover.jpg'),
        'cover_image_focal_x' => -1,
        'cover_image_focal_y' => 101,
    ]);

    $invalidFocalResponse->assertInvalid([
        'cover_image_focal_x',
        'cover_image_focal_y',
    ]);
});

it('keeps editorial covers isolated by the active manufacturer tenant', function () {
    $otherManufacturer = Manufacturer::factory()->create(['is_active' => true]);
    $otherPath = "manufacturers/{$otherManufacturer->id}/catalog/covers/original.jpg";
    $otherThumbnailPath = "manufacturers/{$otherManufacturer->id}/catalog/covers/thumbnails/original.jpg";
    Storage::disk('public')->put($otherPath, 'other-cover');
    Storage::disk('public')->put($otherThumbnailPath, 'other-thumbnail');
    $otherSetting = CatalogSetting::factory()->forManufacturer($otherManufacturer)->create([
        'cover_image_path' => $otherPath,
        'cover_thumbnail_path' => $otherThumbnailPath,
    ]);

    $response = $this->actingAs($this->user)->post(route('manufacturer.catalog-settings.cover'), [
        'cover_image' => UploadedFile::fake()->image('my-cover.jpg'),
    ]);

    $response->assertRedirect();
    $otherSetting->refresh();
    $ownSetting = CatalogSetting::where('manufacturer_id', $this->manufacturer->id)->firstOrFail();

    expect($otherSetting->cover_image_path)->toBe($otherPath)
        ->and($otherSetting->cover_thumbnail_path)->toBe($otherThumbnailPath)
        ->and($ownSetting->cover_image_path)
        ->toStartWith("manufacturers/{$this->manufacturer->id}/catalog/covers/");

    Storage::disk('public')->assertExists($otherPath);
    Storage::disk('public')->assertExists($otherThumbnailPath);
});

it('saves independent heading and body fonts with focal point updates', function () {
    CatalogSetting::factory()->forManufacturer($this->manufacturer)->create();

    $response = $this->actingAs($this->user)->put(route('manufacturer.catalog-settings.update'), [
        'brand_name' => 'Test Brand',
        'primary_color' => '#0F766E',
        'secondary_color' => '#0F172A',
        'accent_color' => '#F97316',
        'background_color' => '#F8FAFC',
        'font_family' => 'space-grotesk',
        'heading_font_family' => 'fraunces',
        'body_font_family' => 'manrope',
        'cover_image_focal_x' => 27,
        'cover_image_focal_y' => 73,
        'public_link_active' => true,
    ]);

    $response->assertRedirect();

    $setting = CatalogSetting::where('manufacturer_id', $this->manufacturer->id)->firstOrFail();

    expect($setting->heading_font_family)->toBe('fraunces')
        ->and($setting->body_font_family)->toBe('manrope')
        ->and($setting->cover_image_focal_x)->toBe(27)
        ->and($setting->cover_image_focal_y)->toBe(73);
});

it('rejects unsupported independent catalog fonts', function () {
    CatalogSetting::factory()->forManufacturer($this->manufacturer)->create();

    $response = $this->actingAs($this->user)->put(route('manufacturer.catalog-settings.update'), [
        'brand_name' => 'Test Brand',
        'primary_color' => '#0F766E',
        'secondary_color' => '#0F172A',
        'accent_color' => '#F97316',
        'background_color' => '#F8FAFC',
        'font_family' => 'space-grotesk',
        'heading_font_family' => 'comic-sans',
        'body_font_family' => 'papyrus',
        'public_link_active' => true,
    ]);

    $response->assertInvalid([
        'heading_font_family',
        'body_font_family',
    ]);
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
            'props' => [
                'show_logo' => true,
                'logo_size' => 135,
                'image_fit' => 'cover',
                'image_scale' => 150,
                'eyebrow' => 'Nova coleção',
                'headline' => 'Kattana',
                'subtitle' => 'Leveza para acompanhar cada descoberta.',
                'cta_text' => 'Conheça a coleção',
                'show_cta' => true,
                'show_product_count' => false,
                'align' => 'center',
            ],
        ],
        [
            'type' => 'product_grid',
            'enabled' => true,
            'props' => [
                'title' => 'Peças da coleção',
                'columns_mobile' => 1,
                'columns_tablet' => 3,
                'columns_desktop' => 4,
                'presentation' => 'editorial',
                'show_price' => false,
                'show_sku' => true,
                'show_stock' => false,
                'show_variations' => true,
                'show_action' => true,
                'show_badges' => false,
                'sort' => 'manual',
            ],
        ],
        [
            'type' => 'collections',
            'enabled' => false,
            'props' => [
                'title' => 'Capítulos da coleção',
                'display' => 'chips',
                'show_counts' => false,
                'max_items' => 8,
            ],
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
    expect($setting->sections)->toHaveCount(3);
    expect(collect($setting->sections)->firstWhere('type', 'hero')['props'])->toMatchArray([
        'headline' => 'Kattana',
        'align' => 'center',
        'show_cta' => true,
    ]);
    expect(collect($setting->sections)->firstWhere('type', 'collections'))->toMatchArray([
        'enabled' => false,
        'props' => [
            'title' => 'Capítulos da coleção',
            'display' => 'chips',
            'show_counts' => false,
            'max_items' => 8,
        ],
    ]);
    expect(collect($setting->sections)->firstWhere('type', 'product_grid')['props'])->toMatchArray([
        'presentation' => 'editorial',
        'columns_desktop' => 4,
        'show_price' => false,
        'sort' => 'manual',
    ]);
});
