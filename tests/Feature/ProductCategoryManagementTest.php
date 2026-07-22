<?php

use App\Enums\UserType;
use App\Models\Manufacturer;
use App\Models\Plan;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\User;

beforeEach(function () {
    $this->withoutVite();

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

it('shows the collection category map with tenant-scoped summary counts', function () {
    $bodies = ProductCategory::factory()->forManufacturer($this->manufacturer)->create([
        'name' => 'Bodies',
        'slug' => 'bodies',
    ]);
    $sets = ProductCategory::factory()->forManufacturer($this->manufacturer)->create([
        'name' => 'Conjuntos',
        'slug' => 'conjuntos',
    ]);

    Product::factory()->forManufacturer($this->manufacturer)->count(2)->create([
        'product_category_id' => $bodies->id,
    ]);
    Product::factory()->forManufacturer($this->manufacturer)->create([
        'product_category_id' => $sets->id,
    ]);
    Product::factory()->forManufacturer($this->manufacturer)->withoutCategory()->create();

    $otherManufacturer = Manufacturer::factory()->create();
    $otherCategory = ProductCategory::factory()->forManufacturer($otherManufacturer)->create();
    Product::factory()->forManufacturer($otherManufacturer)->create([
        'product_category_id' => $otherCategory->id,
    ]);

    $this->get(route('manufacturer.categories.index'))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('manufacturer/categories/index')
            ->has('categories.data', 2)
            ->where('categories.data.0.name', 'Bodies')
            ->where('categories.data.0.products_count', 2)
            ->where('categories.data.1.name', 'Conjuntos')
            ->where('categories.data.1.products_count', 1)
            ->where('category_summary.total_categories', 2)
            ->where('category_summary.categorized_products', 3)
            ->where('category_summary.uncategorized_products', 1)
        );
});

it('searches categories without changing the collection summary', function () {
    ProductCategory::factory()->forManufacturer($this->manufacturer)->create([
        'name' => 'Bodies',
        'slug' => 'bodies',
    ]);
    ProductCategory::factory()->forManufacturer($this->manufacturer)->create([
        'name' => 'Conjuntos',
        'slug' => 'conjuntos',
    ]);

    $this->get(route('manufacturer.categories.index', ['search' => 'Bodies']))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->has('categories.data', 1)
            ->where('categories.data.0.name', 'Bodies')
            ->where('category_summary.total_categories', 2)
            ->where('filters.search', 'Bodies')
        );
});

it('creates and renames a category with an automatic slug', function () {
    $this->post(route('manufacturer.categories.store'), [
        'name' => 'Linha Aconchego',
    ])->assertRedirect();

    $category = ProductCategory::where('manufacturer_id', $this->manufacturer->id)
        ->where('slug', 'linha-aconchego')
        ->firstOrFail();

    $this->put(route('manufacturer.categories.update', $category), [
        'name' => 'Conceito Aconchego',
    ])->assertRedirect();

    expect($category->refresh())
        ->name->toBe('Conceito Aconchego')
        ->slug->toBe('conceito-aconchego');
});

it('only deletes categories that have no products', function () {
    $categoryInUse = ProductCategory::factory()->forManufacturer($this->manufacturer)->create();
    Product::factory()->forManufacturer($this->manufacturer)->create([
        'product_category_id' => $categoryInUse->id,
    ]);
    $emptyCategory = ProductCategory::factory()->forManufacturer($this->manufacturer)->create();

    $this->delete(route('manufacturer.categories.destroy', $categoryInUse))
        ->assertRedirect()
        ->assertSessionHas('error');

    $this->delete(route('manufacturer.categories.destroy', $emptyCategory))
        ->assertRedirect()
        ->assertSessionHas('success');

    $this->assertDatabaseHas('product_categories', ['id' => $categoryInUse->id]);
    $this->assertDatabaseMissing('product_categories', ['id' => $emptyCategory->id]);
});
