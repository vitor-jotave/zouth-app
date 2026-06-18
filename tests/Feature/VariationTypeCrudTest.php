<?php

use App\Enums\UserType;
use App\Models\Manufacturer;
use App\Models\Plan;
use App\Models\Product;
use App\Models\ProductVariation;
use App\Models\User;
use App\Models\VariationType;
use App\Models\VariationValue;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $plan = Plan::factory()->premium()->create();
    $this->manufacturer = Manufacturer::factory()->create([
        'is_active' => true,
        'current_plan_id' => $plan->id,
    ]);
    $this->owner = User::factory()->create([
        'user_type' => UserType::ManufacturerUser,
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);

    $this->manufacturer->users()->attach($this->owner->id, [
        'role' => 'owner',
        'status' => 'active',
    ]);

    $this->actingAs($this->owner);
});

// --- Index ---

it('lists variation types for the current manufacturer', function () {
    $type = VariationType::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'name' => 'Tamanho',
    ]);
    VariationValue::factory()->create([
        'variation_type_id' => $type->id,
        'value' => 'P',
    ]);

    $response = $this->get('/manufacturer/variation-types');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('manufacturer/variation-types/index')
        ->has('variation_types', 1)
        ->where('variation_types.0.name', 'Tamanho')
        ->has('variation_types.0.values', 1)
        ->where('variation_types.0.values.0.value', 'P')
    );
});

it('does not list variation types from other manufacturers', function () {
    $otherManufacturer = Manufacturer::factory()->create();
    VariationType::factory()->create([
        'manufacturer_id' => $otherManufacturer->id,
        'name' => 'Material',
    ]);

    $response = $this->get('/manufacturer/variation-types');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->has('variation_types', 0)
    );
});

// --- Store ---

it('creates a variation type with values', function () {
    $response = $this->post('/manufacturer/variation-types', [
        'name' => 'Tamanho',
        'is_color_type' => false,
        'values' => [
            ['value' => 'P', 'hex' => null],
            ['value' => 'M', 'hex' => null],
            ['value' => 'G', 'hex' => null],
        ],
    ]);

    $response->assertRedirect();

    $this->assertDatabaseHas('variation_types', [
        'manufacturer_id' => $this->manufacturer->id,
        'name' => 'Tamanho',
        'is_color_type' => false,
    ]);

    $type = VariationType::where('name', 'Tamanho')->first();
    expect($type->values)->toHaveCount(3);
    expect($type->values->pluck('value')->all())->toBe(['P', 'M', 'G']);
});

it('creates a color type variation with hex values', function () {
    $response = $this->post('/manufacturer/variation-types', [
        'name' => 'Cor',
        'is_color_type' => true,
        'values' => [
            ['value' => 'Azul', 'hex' => '#0000FF'],
            ['value' => 'Vermelho', 'hex' => '#FF0000'],
        ],
    ]);

    $response->assertRedirect();

    $type = VariationType::where('name', 'Cor')->first();
    expect($type->is_color_type)->toBeTrue();
    expect($type->values->first()->hex)->toBe('#0000FF');
});

it('creates a color type variation with image values', function () {
    Storage::fake('s3');

    $response = $this->post('/manufacturer/variation-types', [
        'name' => 'Estampa',
        'is_color_type' => true,
        'values' => [
            [
                'value' => 'Bolinhas',
                'hex' => null,
                'image' => UploadedFile::fake()->image('bolinhas.png', 80, 80),
            ],
        ],
    ]);

    $response->assertRedirect();

    $type = VariationType::where('name', 'Estampa')->first();
    $value = $type->values->first();

    expect($value->hex)->toBeNull();
    expect($value->image_path)->not->toBeNull();
    expect(str_starts_with($value->image_path, 'variation-values/'))->toBeTrue();
    Storage::disk('s3')->assertExists($value->image_path);
});

it('requires a name to create a variation type', function () {
    $response = $this->post('/manufacturer/variation-types', [
        'name' => '',
        'values' => [['value' => 'P']],
    ]);

    $response->assertSessionHasErrors('name');
});

it('requires unique name per manufacturer', function () {
    VariationType::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'name' => 'Tamanho',
    ]);

    $response = $this->post('/manufacturer/variation-types', [
        'name' => 'Tamanho',
        'values' => [['value' => 'P']],
    ]);

    $response->assertSessionHasErrors('name');
});

it('allows same name for different manufacturers', function () {
    $otherManufacturer = Manufacturer::factory()->create();
    VariationType::factory()->create([
        'manufacturer_id' => $otherManufacturer->id,
        'name' => 'Tamanho',
    ]);

    $response = $this->post('/manufacturer/variation-types', [
        'name' => 'Tamanho',
        'values' => [['value' => 'P']],
    ]);

    $response->assertRedirect();
    $response->assertSessionHasNoErrors();
});

// --- Update ---

it('updates a variation type name and syncs values', function () {
    $type = VariationType::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'name' => 'Tamanho',
    ]);
    $valueP = VariationValue::factory()->create([
        'variation_type_id' => $type->id,
        'value' => 'P',
    ]);
    VariationValue::factory()->create([
        'variation_type_id' => $type->id,
        'value' => 'M',
    ]);

    $response = $this->put("/manufacturer/variation-types/{$type->id}", [
        'name' => 'Tamanho Atualizado',
        'is_color_type' => false,
        'values' => [
            ['id' => $valueP->id, 'value' => 'PP'],
            ['value' => 'GG'],
        ],
    ]);

    $response->assertRedirect();

    $type->refresh();
    expect($type->name)->toBe('Tamanho Atualizado');

    $values = $type->values()->orderBy('display_order')->get();
    expect($values)->toHaveCount(2);
    expect($values[0]->value)->toBe('PP');
    expect($values[1]->value)->toBe('GG');
});

it('removes values not included in update', function () {
    $type = VariationType::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
    ]);
    $kept = VariationValue::factory()->create([
        'variation_type_id' => $type->id,
        'value' => 'Kept',
    ]);
    $removed = VariationValue::factory()->create([
        'variation_type_id' => $type->id,
        'value' => 'Removed',
    ]);

    $this->put("/manufacturer/variation-types/{$type->id}", [
        'name' => $type->name,
        'values' => [
            ['id' => $kept->id, 'value' => 'Kept'],
        ],
    ]);

    expect(VariationValue::find($removed->id))->toBeNull();
    expect(VariationValue::find($kept->id))->not->toBeNull();
});

it('replaces a variation value image on update', function () {
    Storage::fake('s3');
    Storage::disk('s3')->put('variation-values/old.png', 'old');

    $type = VariationType::factory()->colorType()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'name' => 'Estampa',
    ]);
    $value = VariationValue::factory()->create([
        'variation_type_id' => $type->id,
        'value' => 'Bolinhas',
        'image_path' => 'variation-values/old.png',
    ]);

    $response = $this->post("/manufacturer/variation-types/{$type->id}", [
        '_method' => 'put',
        'name' => 'Estampa',
        'is_color_type' => true,
        'values' => [
            [
                'id' => $value->id,
                'value' => 'Bolinhas',
                'hex' => null,
                'image' => UploadedFile::fake()->image('bolinhas-nova.png', 80, 80),
            ],
        ],
    ]);

    $response->assertRedirect();

    $value->refresh();

    expect($value->image_path)->not->toBe('variation-values/old.png');
    Storage::disk('s3')->assertMissing('variation-values/old.png');
    Storage::disk('s3')->assertExists($value->image_path);
});

// --- Destroy ---

it('deletes a variation type not in use', function () {
    $type = VariationType::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
    ]);
    VariationValue::factory()->create(['variation_type_id' => $type->id]);

    $response = $this->delete("/manufacturer/variation-types/{$type->id}");

    $response->assertRedirect();
    expect(VariationType::find($type->id))->toBeNull();
});

it('prevents deleting a variation type used by products', function () {
    $type = VariationType::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
    ]);

    $product = Product::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
    ]);
    ProductVariation::create([
        'product_id' => $product->id,
        'variation_type_id' => $type->id,
    ]);

    $response = $this->delete("/manufacturer/variation-types/{$type->id}");

    $response->assertRedirect();
    $response->assertSessionHas('error');
    expect(VariationType::find($type->id))->not->toBeNull();
});

// --- Authorization ---

it('prevents access by non-manufacturer users', function () {
    $repUser = User::factory()->create([
        'user_type' => UserType::SalesRep,
        'current_manufacturer_id' => null,
    ]);

    $this->actingAs($repUser);

    $this->get('/manufacturer/variation-types')->assertForbidden();
    $this->post('/manufacturer/variation-types', ['name' => 'Test', 'values' => []])->assertForbidden();
});

it('prevents updating variation types from other manufacturers', function () {
    $otherManufacturer = Manufacturer::factory()->create();
    $otherType = VariationType::factory()->create([
        'manufacturer_id' => $otherManufacturer->id,
    ]);

    $response = $this->put("/manufacturer/variation-types/{$otherType->id}", [
        'name' => 'Hacked',
        'values' => [],
    ]);

    $response->assertForbidden();
});

it('prevents deleting variation types from other manufacturers', function () {
    $otherManufacturer = Manufacturer::factory()->create();
    $otherType = VariationType::factory()->create([
        'manufacturer_id' => $otherManufacturer->id,
    ]);

    $response = $this->delete("/manufacturer/variation-types/{$otherType->id}");

    $response->assertForbidden();
});
