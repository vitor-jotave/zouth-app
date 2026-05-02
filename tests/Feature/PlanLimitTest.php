<?php

use App\Models\CatalogSetting;
use App\Models\Manufacturer;
use App\Models\ManufacturerAffiliation;
use App\Models\Order;
use App\Models\Plan;
use App\Models\Product;
use App\Models\ProductMedia;
use App\Models\User;
use App\Services\PlanLimitService;

function setupManufacturerWithPlan(array $planOverrides = []): array
{
    $plan = Plan::factory()->create($planOverrides);
    $manufacturer = Manufacturer::factory()->create([
        'is_active' => true,
        'current_plan_id' => $plan->id,
    ]);
    $user = User::factory()->create([
        'user_type' => 'manufacturer_user',
        'current_manufacturer_id' => $manufacturer->id,
    ]);
    $manufacturer->users()->attach($user->id, ['role' => 'owner', 'status' => 'active']);

    return [$manufacturer, $plan, $user];
}

function validPublicOrderPayload(array $overrides = []): array
{
    return [
        'customer_name' => 'Cliente',
        'customer_phone' => '(11) 99999-9999',
        'customer_document_type' => 'cpf',
        'customer_document' => '529.982.247-25',
        'customer_zip_code' => '01001-000',
        'customer_state' => 'SP',
        'customer_city' => 'Sao Paulo',
        'customer_neighborhood' => 'Se',
        'customer_street' => 'Praca da Se',
        'customer_address_number' => '100',
        ...$overrides,
    ];
}

test('canCreateProduct returns true when under limit', function () {
    [$manufacturer] = setupManufacturerWithPlan(['max_products' => 10]);
    $service = app(PlanLimitService::class);

    expect($service->canCreateProduct($manufacturer))->toBeTrue();
});

test('canCreateProduct returns false when at limit', function () {
    [$manufacturer] = setupManufacturerWithPlan(['max_products' => 2]);

    // Create 2 products to reach the limit
    Product::factory()->count(2)->create(['manufacturer_id' => $manufacturer->id]);

    $service = app(PlanLimitService::class);
    expect($service->canCreateProduct($manufacturer))->toBeFalse();
});

test('canCreateProduct returns true when unlimited', function () {
    [$manufacturer] = setupManufacturerWithPlan(['max_products' => null]);

    // Create many products — use sequence to avoid SKU collisions
    for ($i = 0; $i < 20; $i++) {
        Product::factory()->create([
            'manufacturer_id' => $manufacturer->id,
            'sku' => 'SKU-UNLIM-'.$i,
        ]);
    }

    $service = app(PlanLimitService::class);
    expect($service->canCreateProduct($manufacturer))->toBeTrue();
});

test('canCreateProduct returns false without plan', function () {
    $manufacturer = Manufacturer::factory()->create([
        'is_active' => true,
        'current_plan_id' => null,
    ]);

    $service = app(PlanLimitService::class);
    expect($service->canCreateProduct($manufacturer))->toBeFalse();
});

test('canCreateOrder returns true when under monthly limit', function () {
    [$manufacturer] = setupManufacturerWithPlan(['max_orders_per_month' => 10]);

    $service = app(PlanLimitService::class);
    expect($service->canCreateOrder($manufacturer))->toBeTrue();
});

test('canCreateOrder returns false when at monthly limit', function () {
    [$manufacturer] = setupManufacturerWithPlan(['max_orders_per_month' => 2]);

    Order::factory()->count(2)->create(['manufacturer_id' => $manufacturer->id]);

    $service = app(PlanLimitService::class);
    expect($service->canCreateOrder($manufacturer))->toBeFalse();
});

test('canCreateOrder ignores orders from previous months', function () {
    [$manufacturer] = setupManufacturerWithPlan(['max_orders_per_month' => 2]);

    // Orders from last month should not count
    Order::factory()->count(5)->create([
        'manufacturer_id' => $manufacturer->id,
        'created_at' => now()->subMonth(),
    ]);

    $service = app(PlanLimitService::class);
    expect($service->canCreateOrder($manufacturer))->toBeTrue();
});

test('canCreateRep returns true when under limit', function () {
    [$manufacturer] = setupManufacturerWithPlan(['max_reps' => 5]);

    $service = app(PlanLimitService::class);
    expect($service->canCreateRep($manufacturer))->toBeTrue();
});

test('canCreateUser returns true when under limit', function () {
    [$manufacturer] = setupManufacturerWithPlan(['max_users' => 5]);

    $service = app(PlanLimitService::class);
    // Has 1 user (owner) from setup — limit is 5
    expect($service->canCreateUser($manufacturer))->toBeTrue();
});

test('canImportCsv returns false when not allowed', function () {
    [$manufacturer] = setupManufacturerWithPlan(['allow_csv_import' => false]);

    $service = app(PlanLimitService::class);
    expect($service->canImportCsv($manufacturer))->toBeFalse();
});

test('canImportCsv returns true when allowed', function () {
    [$manufacturer] = setupManufacturerWithPlan(['allow_csv_import' => true]);

    $service = app(PlanLimitService::class);
    expect($service->canImportCsv($manufacturer))->toBeTrue();
});

test('usage returns empty array without plan', function () {
    $manufacturer = Manufacturer::factory()->create([
        'is_active' => true,
        'current_plan_id' => null,
    ]);

    $service = app(PlanLimitService::class);
    expect($service->usage($manufacturer))->toBe([]);
});

test('usage returns correct data with plan', function () {
    [$manufacturer, $plan] = setupManufacturerWithPlan([
        'max_products' => 50,
        'max_users' => 5,
        'max_reps' => 10,
        'max_orders_per_month' => 60,
    ]);

    Product::factory()->count(5)->create(['manufacturer_id' => $manufacturer->id]);
    Order::factory()->count(3)->create(['manufacturer_id' => $manufacturer->id]);

    $service = app(PlanLimitService::class);
    $usage = $service->usage($manufacturer);

    expect($usage)->toHaveKeys(['products', 'users', 'reps', 'orders_this_month']);
    expect($usage['products']['current'])->toBe(5);
    expect($usage['products']['limit'])->toBe(50);
    expect($usage['products']['percentage'])->toBe(10);
    expect($usage['orders_this_month']['current'])->toBe(3);
});

// ──────────────────────────────────────────────
// Controller enforcement: products
// ──────────────────────────────────────────────

test('product store is blocked when product limit is reached', function () {
    [$manufacturer, , $user] = setupManufacturerWithPlan(['max_products' => 2]);

    Product::factory()->count(2)->create(['manufacturer_id' => $manufacturer->id]);

    $payload = [
        'name' => 'Produto Extra',
        'sku' => 'SKU-EXTRA',
        'base_quantity' => 0,
        'variations' => [],
        'variant_stocks' => [],
    ];

    $this->actingAs($user)
        ->post(route('manufacturer.products.store'), $payload)
        ->assertSessionHasErrors('limit');
});

test('product store succeeds when under product limit', function () {
    [$manufacturer, , $user] = setupManufacturerWithPlan(['max_products' => 5]);

    Product::factory()->count(2)->create(['manufacturer_id' => $manufacturer->id]);

    $payload = [
        'name' => 'Produto OK',
        'sku' => 'SKU-OK',
        'base_quantity' => 0,
        'variations' => [],
        'variant_stocks' => [],
    ];

    $this->actingAs($user)
        ->post(route('manufacturer.products.store'), $payload)
        ->assertSessionMissing('errors');

    $this->assertDatabaseHas('products', ['sku' => 'SKU-OK']);
});

// ──────────────────────────────────────────────
// Controller enforcement: orders
// ──────────────────────────────────────────────

test('public order is blocked when monthly order limit is reached', function () {
    [$manufacturer] = setupManufacturerWithPlan(['max_orders_per_month' => 2]);

    Order::factory()->count(2)->create(['manufacturer_id' => $manufacturer->id]);

    $catalogSetting = CatalogSetting::create([
        'manufacturer_id' => $manufacturer->id,
        ...CatalogSetting::defaults($manufacturer->name),
    ]);

    $product = Product::factory()->create(['manufacturer_id' => $manufacturer->id, 'is_active' => true]);

    $this->post("/catalog/{$catalogSetting->public_token}/orders", validPublicOrderPayload([
        'items' => [['product_id' => $product->id, 'quantity' => 1]],
    ]))->assertSessionHasErrors('limit');
});

test('public order succeeds when under monthly order limit', function () {
    [$manufacturer] = setupManufacturerWithPlan(['max_orders_per_month' => 10]);

    $catalogSetting = CatalogSetting::create([
        'manufacturer_id' => $manufacturer->id,
        ...CatalogSetting::defaults($manufacturer->name),
    ]);

    $product = Product::factory()->create(['manufacturer_id' => $manufacturer->id, 'is_active' => true]);

    $this->post("/catalog/{$catalogSetting->public_token}/orders", validPublicOrderPayload([
        'items' => [['product_id' => $product->id, 'quantity' => 1]],
    ]))->assertSessionMissing('errors');

    expect(Order::count())->toBe(1);
});

// ──────────────────────────────────────────────
// Controller enforcement: users
// ──────────────────────────────────────────────

test('user store is blocked when user limit is reached', function () {
    [$manufacturer, , $user] = setupManufacturerWithPlan(['max_users' => 1]);
    // Already one user attached in setup — limit is 1

    $this->actingAs($user)
        ->post(route('users.store'), [
            'name' => 'Novo Usuário',
            'email' => 'novo@example.com',
            'role' => 'staff',
        ])
        ->assertSessionHasErrors('limit');
});

test('user store succeeds when under user limit', function () {
    [$manufacturer, , $user] = setupManufacturerWithPlan(['max_users' => 10]);

    $this->actingAs($user)
        ->post(route('users.store'), [
            'name' => 'Novo Usuário',
            'email' => 'novo+'.uniqid().'@example.com',
            'role' => 'staff',
        ])
        ->assertSessionMissing('errors');
});

// ──────────────────────────────────────────────
// Controller enforcement: reps (affiliations)
// ──────────────────────────────────────────────

test('affiliation approve is blocked when rep limit is reached', function () {
    [$manufacturer, , $user] = setupManufacturerWithPlan(['max_reps' => 1]);

    $existingRep = User::factory()->create(['user_type' => 'sales_rep']);
    ManufacturerAffiliation::create(['manufacturer_id' => $manufacturer->id, 'user_id' => $existingRep->id, 'status' => 'active']);

    $newRep = User::factory()->create(['user_type' => 'sales_rep']);
    $pendingAffiliation = ManufacturerAffiliation::create([
        'manufacturer_id' => $manufacturer->id,
        'user_id' => $newRep->id,
        'status' => 'pending',
    ]);

    $this->actingAs($user)
        ->post("/affiliations/{$pendingAffiliation->id}/approve")
        ->assertRedirect()
        ->assertSessionHas('error');

    expect($pendingAffiliation->fresh()->status)->toBe('pending');
});

test('affiliation approve succeeds when under rep limit', function () {
    [$manufacturer, , $user] = setupManufacturerWithPlan(['max_reps' => 5]);

    $rep = User::factory()->create(['user_type' => 'sales_rep']);
    $affiliation = ManufacturerAffiliation::create([
        'manufacturer_id' => $manufacturer->id,
        'user_id' => $rep->id,
        'status' => 'pending',
    ]);

    $this->actingAs($user)
        ->post("/affiliations/{$affiliation->id}/approve")
        ->assertRedirect();

    expect($affiliation->fresh()->status)->toBe('active');
});

test('canCreateRep counts active affiliations correctly', function () {
    [$manufacturer] = setupManufacturerWithPlan(['max_reps' => 2]);

    $rep1 = User::factory()->create(['user_type' => 'sales_rep']);
    $rep2 = User::factory()->create(['user_type' => 'sales_rep']);
    ManufacturerAffiliation::create(['manufacturer_id' => $manufacturer->id, 'user_id' => $rep1->id, 'status' => 'active']);
    ManufacturerAffiliation::create(['manufacturer_id' => $manufacturer->id, 'user_id' => $rep2->id, 'status' => 'active']);

    $service = app(PlanLimitService::class);
    expect($service->canCreateRep($manufacturer))->toBeFalse();
});

test('canCreateRep does not count rejected or pending affiliations', function () {
    [$manufacturer] = setupManufacturerWithPlan(['max_reps' => 2]);

    $rep1 = User::factory()->create(['user_type' => 'sales_rep']);
    $rep2 = User::factory()->create(['user_type' => 'sales_rep']);
    ManufacturerAffiliation::create(['manufacturer_id' => $manufacturer->id, 'user_id' => $rep1->id, 'status' => 'pending']);
    ManufacturerAffiliation::create(['manufacturer_id' => $manufacturer->id, 'user_id' => $rep2->id, 'status' => 'rejected']);

    $service = app(PlanLimitService::class);
    expect($service->canCreateRep($manufacturer))->toBeTrue();
});

test('violatedLimitsForPlan returns empty array when within all limits', function () {
    [$manufacturer] = setupManufacturerWithPlan();
    $targetPlan = Plan::factory()->create(['max_products' => 100, 'max_users' => 100, 'max_reps' => 100]);
    Product::factory()->count(2)->create(['manufacturer_id' => $manufacturer->id]);

    $service = app(PlanLimitService::class);
    expect($service->violatedLimitsForPlan($manufacturer, $targetPlan))->toBeEmpty();
});

test('violatedLimitsForPlan returns products violation when products exceed target limit', function () {
    [$manufacturer] = setupManufacturerWithPlan();
    Product::factory()->count(5)->create(['manufacturer_id' => $manufacturer->id]);
    $targetPlan = Plan::factory()->create(['max_products' => 3, 'max_users' => 100, 'max_reps' => 100]);

    $service = app(PlanLimitService::class);
    $violations = $service->violatedLimitsForPlan($manufacturer, $targetPlan);

    expect($violations)->toHaveCount(1)
        ->and($violations[0]['limit_type'])->toBe('products')
        ->and($violations[0]['current'])->toBe(5)
        ->and($violations[0]['limit'])->toBe(3);
});

test('violatedLimitsForPlan returns multiple violations when several limits exceeded', function () {
    [$manufacturer] = setupManufacturerWithPlan();
    Product::factory()->count(5)->create(['manufacturer_id' => $manufacturer->id]);
    $rep = User::factory()->create(['user_type' => 'sales_rep']);
    ManufacturerAffiliation::create(['manufacturer_id' => $manufacturer->id, 'user_id' => $rep->id, 'status' => 'active']);
    $targetPlan = Plan::factory()->create(['max_products' => 2, 'max_users' => 100, 'max_reps' => 0]);

    $service = app(PlanLimitService::class);
    $violations = $service->violatedLimitsForPlan($manufacturer, $targetPlan);
    $types = array_column($violations, 'limit_type');

    expect($violations)->toHaveCount(2)
        ->and($types)->toContain('products')
        ->and($types)->toContain('reps');
});

test('violatedLimitsForPlan returns empty for unlimited target plan', function () {
    [$manufacturer] = setupManufacturerWithPlan();
    for ($i = 0; $i < 50; $i++) {
        Product::factory()->create([
            'manufacturer_id' => $manufacturer->id,
            'sku' => 'SKU-UNLIMITED-TARGET-'.$i,
        ]);
    }
    $targetPlan = Plan::factory()->create(['max_products' => null, 'max_users' => null, 'max_reps' => null, 'max_orders_per_month' => null]);

    $service = app(PlanLimitService::class);
    expect($service->violatedLimitsForPlan($manufacturer, $targetPlan))->toBeEmpty();
});

// ─── Files (max_files_gb) ─────────────────────────────────────────────────────

test('currentFilesUsageBytes returns 0 when no media', function () {
    [$manufacturer] = setupManufacturerWithPlan();
    $service = app(PlanLimitService::class);

    expect($service->currentFilesUsageBytes($manufacturer))->toBe(0);
});

test('currentFilesUsageBytes sums file_size_bytes of all manufacturer media', function () {
    [$manufacturer] = setupManufacturerWithPlan();
    $product = Product::factory()->create(['manufacturer_id' => $manufacturer->id]);
    ProductMedia::factory()->create(['product_id' => $product->id, 'file_size_bytes' => 5_000_000]);
    ProductMedia::factory()->create(['product_id' => $product->id, 'file_size_bytes' => 3_000_000]);

    $service = app(PlanLimitService::class);
    expect($service->currentFilesUsageBytes($manufacturer))->toBe(8_000_000);
});

test('currentFilesUsageBytes excludes media from other manufacturers', function () {
    [$manufacturer] = setupManufacturerWithPlan();
    [$otherManufacturer] = setupManufacturerWithPlan();
    $myProduct = Product::factory()->create(['manufacturer_id' => $manufacturer->id]);
    $otherProduct = Product::factory()->create(['manufacturer_id' => $otherManufacturer->id]);
    ProductMedia::factory()->create(['product_id' => $myProduct->id, 'file_size_bytes' => 2_000_000]);
    ProductMedia::factory()->create(['product_id' => $otherProduct->id, 'file_size_bytes' => 9_000_000]);

    $service = app(PlanLimitService::class);
    expect($service->currentFilesUsageBytes($manufacturer))->toBe(2_000_000);
});

test('canUploadFile returns true when below limit', function () {
    [$manufacturer] = setupManufacturerWithPlan(['max_files_gb' => 1]);
    $service = app(PlanLimitService::class);

    // Uploading 100 MB on a 1 GB plan should pass
    expect($service->canUploadFile($manufacturer, 100 * 1_048_576))->toBeTrue();
});

test('canUploadFile returns false when upload would exceed limit', function () {
    [$manufacturer] = setupManufacturerWithPlan(['max_files_gb' => 1]);
    $product = Product::factory()->create(['manufacturer_id' => $manufacturer->id]);
    // Already used 900 MB
    ProductMedia::factory()->create(['product_id' => $product->id, 'file_size_bytes' => 900 * 1_048_576]);

    $service = app(PlanLimitService::class);
    // Trying to upload 200 MB would exceed 1 GB
    expect($service->canUploadFile($manufacturer, 200 * 1_048_576))->toBeFalse();
});

test('canUploadFile returns true when plan is unlimited', function () {
    [$manufacturer] = setupManufacturerWithPlan(['max_files_gb' => null]);
    $service = app(PlanLimitService::class);

    expect($service->canUploadFile($manufacturer, 100 * 1_073_741_824))->toBeTrue();
});

test('canUploadFile returns false when no plan', function () {
    $manufacturer = Manufacturer::factory()->create(['current_plan_id' => null]);
    $service = app(PlanLimitService::class);

    expect($service->canUploadFile($manufacturer, 1_000))->toBeFalse();
});

// ─── Structured data (max_data_mb) ───────────────────────────────────────────

test('currentDataUsageMb returns a float based on row counts', function () {
    [$manufacturer] = setupManufacturerWithPlan();
    Product::factory()->count(10)->create(['manufacturer_id' => $manufacturer->id]);

    $service = app(PlanLimitService::class);
    $mb = $service->currentDataUsageMb($manufacturer);

    expect($mb)->toBeFloat()->toBeGreaterThan(0);
});

test('canStoreData returns true when below limit', function () {
    [$manufacturer] = setupManufacturerWithPlan(['max_data_mb' => 100]);
    $service = app(PlanLimitService::class);

    expect($service->canStoreData($manufacturer))->toBeTrue();
});

test('canStoreData returns false when over limit', function () {
    // max_data_mb of 0 will always be exceeded
    [$manufacturer] = setupManufacturerWithPlan(['max_data_mb' => 0]);
    Product::factory()->count(5)->create(['manufacturer_id' => $manufacturer->id]);

    $service = app(PlanLimitService::class);
    expect($service->canStoreData($manufacturer))->toBeFalse();
});

test('canStoreData returns true when plan is unlimited', function () {
    [$manufacturer] = setupManufacturerWithPlan(['max_data_mb' => null]);
    $service = app(PlanLimitService::class);

    expect($service->canStoreData($manufacturer))->toBeTrue();
});

test('violatedLimitsForPlan includes files_gb violation when usage exceeds target', function () {
    [$manufacturer] = setupManufacturerWithPlan();
    $product = Product::factory()->create(['manufacturer_id' => $manufacturer->id]);
    // 2 GB used
    ProductMedia::factory()->create(['product_id' => $product->id, 'file_size_bytes' => 2 * 1_073_741_824]);
    $targetPlan = Plan::factory()->create(['max_files_gb' => 1, 'max_data_mb' => null, 'max_products' => null, 'max_users' => null, 'max_reps' => null, 'max_orders_per_month' => null]);

    $service = app(PlanLimitService::class);
    $violations = $service->violatedLimitsForPlan($manufacturer, $targetPlan);
    $types = array_column($violations, 'limit_type');

    expect($types)->toContain('files_gb');
});

test('violatedLimitsForPlan includes data_mb violation when usage exceeds target', function () {
    [$manufacturer] = setupManufacturerWithPlan();
    // Create enough products to exceed a 0 MB limit
    Product::factory()->count(5)->create(['manufacturer_id' => $manufacturer->id]);
    $targetPlan = Plan::factory()->create(['max_data_mb' => 0, 'max_files_gb' => null, 'max_products' => null, 'max_users' => null, 'max_reps' => null, 'max_orders_per_month' => null]);

    $service = app(PlanLimitService::class);
    $violations = $service->violatedLimitsForPlan($manufacturer, $targetPlan);
    $types = array_column($violations, 'limit_type');

    expect($types)->toContain('data_mb');
});
