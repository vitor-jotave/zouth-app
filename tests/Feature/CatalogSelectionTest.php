<?php

use App\Models\CatalogSetting;
use App\Models\Manufacturer;
use App\Models\Product;

it('refreshes only active products belonging to the public catalog without pagination filters', function () {
    $manufacturer = Manufacturer::factory()->create(['is_active' => true]);
    $catalog = CatalogSetting::factory()->create(['manufacturer_id' => $manufacturer->id, 'public_link_active' => true]);
    $product = Product::factory()->create(['manufacturer_id' => $manufacturer->id, 'is_active' => true, 'price_cents' => 12345, 'base_quantity' => 8]);
    $hidden = Product::factory()->create(['manufacturer_id' => $manufacturer->id, 'is_active' => false]);
    $foreign = Product::factory()->create(['is_active' => true]);
    $this->getJson(route('public.catalog.selection', ['token' => $catalog->public_token, 'product_ids' => [$product->id, $hidden->id, $foreign->id]]))
        ->assertSuccessful()->assertJsonCount(1, 'products')
        ->assertJsonPath('products.0.id', $product->id)
        ->assertJsonPath('products.0.price_cents', 12345)
        ->assertJsonPath('products.0.total_stock', 8);
});

it('does not expose hidden prices when restoring a selection', function () {
    $manufacturer = Manufacturer::factory()->create(['is_active' => true]);
    $catalog = CatalogSetting::factory()->create(['manufacturer_id' => $manufacturer->id, 'public_link_active' => true, 'hide_prices' => true]);
    $product = Product::factory()->create(['manufacturer_id' => $manufacturer->id, 'is_active' => true, 'price_cents' => 12345]);
    $this->getJson(route('public.catalog.selection', ['token' => $catalog->public_token, 'product_ids' => [$product->id]]))
        ->assertSuccessful()->assertJsonMissingPath('products.0.price_cents');
    $catalog->update(['public_link_active' => false]);
    $this->getJson(route('public.catalog.selection', ['token' => $catalog->public_token, 'product_ids' => [$product->id]]))->assertNotFound();
});

it('validates selection requests before resolving products', function () {
    $this->getJson(route('public.catalog.selection', ['token' => 'anything', 'product_ids' => [1, 1]]))->assertUnprocessable();
    $this->getJson(route('public.catalog.selection', ['token' => 'anything', 'product_ids' => range(1, 201)]))->assertUnprocessable();
});

it('refuses selection recovery when the trial has expired', function () {
    $manufacturer = Manufacturer::factory()->create(['is_active' => true, 'trial_started_at' => now()->subDays(8), 'trial_ends_at' => now()->subDay()]);
    $catalog = CatalogSetting::factory()->create(['manufacturer_id' => $manufacturer->id, 'public_link_active' => true]);
    $this->getJson(route('public.catalog.selection', ['token' => $catalog->public_token, 'product_ids' => [1]]))->assertForbidden();
});
