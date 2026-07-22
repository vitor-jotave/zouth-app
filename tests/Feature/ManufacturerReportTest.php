<?php

use App\Enums\OrderStatus;
use App\Enums\UserType;
use App\Models\CatalogSetting;
use App\Models\CatalogVisit;
use App\Models\Customer;
use App\Models\Manufacturer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Plan;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\User;
use Carbon\CarbonImmutable;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
    CarbonImmutable::setTestNow('2026-07-21 12:00:00');

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
    $this->manufacturer->update(['primary_owner_user_id' => $this->owner->id]);
});

afterEach(function () {
    CarbonImmutable::setTestNow();
});

it('shows tenant scoped commercial indicators and compares the selected period', function () {
    $category = ProductCategory::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'name' => 'Macacões',
    ]);
    $product = Product::factory()->forManufacturer($this->manufacturer)->create([
        'product_category_id' => $category->id,
        'name' => 'Macacão Aconchego',
        'sku' => 'MAC-001',
        'base_quantity' => 18,
    ]);
    $customer = Customer::factory()->forManufacturer($this->manufacturer)->create([
        'name' => 'Boutique Aurora',
        'state' => 'SP',
    ]);

    $firstOrder = reportOrder($this->manufacturer, $customer, '2026-07-06 10:00:00', 100_000);
    reportItem($firstOrder, $product, 10, '100.00');
    $secondOrder = reportOrder($this->manufacturer, $customer, '2026-07-18 10:00:00', 50_000);
    reportItem($secondOrder, $product, 5, '100.00');

    $cancelled = reportOrder($this->manufacturer, $customer, '2026-07-20 10:00:00', 999_000, OrderStatus::Cancelled);
    reportItem($cancelled, $product, 1, '9990.00');

    $previous = reportOrder($this->manufacturer, $customer, '2026-06-18 10:00:00', 100_000);
    reportItem($previous, $product, 10, '100.00');

    $catalog = CatalogSetting::factory()->forManufacturer($this->manufacturer)->create();
    CatalogVisit::factory()->count(10)->forCatalogSetting($catalog)->create([
        'visited_at' => '2026-07-10 11:00:00',
        'utm_source' => 'instagram',
    ]);
    CatalogVisit::factory()->count(4)->forCatalogSetting($catalog)->create([
        'visited_at' => '2026-06-18 11:00:00',
    ]);

    $otherManufacturer = Manufacturer::factory()->create();
    reportOrder($otherManufacturer, null, '2026-07-18 10:00:00', 700_000);

    $this->actingAs($this->owner)
        ->get(route('manufacturer.reports.index', ['period' => '30_days']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('manufacturer/reports/index')
            ->where('manufacturer.name', $this->manufacturer->name)
            ->where('report.period.key', '30_days')
            ->where('report.summary.net_revenue_cents', 150_000)
            ->where('report.summary.orders_count', 2)
            ->where('report.summary.average_order_value_cents', 75_000)
            ->where('report.summary.conversion_rate', 20)
            ->where('report.summary.net_revenue_change_percent', 50)
            ->where('report.top_products.0.name', 'Macacão Aconchego')
            ->where('report.top_products.0.units', 15)
            ->where('report.collection.categories.0.name', 'Macacões')
            ->where('report.customers.buyers_count', 1)
            ->where('report.customers.repeat_rate', 100)
            ->where('report.catalog.sources.0.source', 'Instagram')
            ->has('report.series', 30));
});

it('protects reports with the dedicated staff capability', function () {
    $blockedStaff = reportStaff($this->manufacturer, []);
    $allowedStaff = reportStaff($this->manufacturer, ['reports.view']);

    $this->actingAs($blockedStaff)
        ->get(route('manufacturer.reports.index'))
        ->assertForbidden();

    $this->actingAs($allowedStaff)
        ->get(route('manufacturer.reports.index'))
        ->assertOk();
});

it('validates custom report periods', function () {
    $this->actingAs($this->owner)
        ->get(route('manufacturer.reports.index', [
            'period' => 'custom',
            'start' => '2026-07-20',
            'end' => '2026-07-01',
        ]))
        ->assertSessionHasErrors(['start', 'end']);

    $this->actingAs($this->owner)
        ->get(route('manufacturer.reports.index', [
            'period' => 'custom',
            'start' => '2026-07-01',
            'end' => '2026-07-21',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('report.period.start', '2026-07-01')
            ->where('report.period.end', '2026-07-21'));
});

it('renders a useful empty report without inventing performance', function () {
    $this->actingAs($this->owner)
        ->get(route('manufacturer.reports.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('report.summary.net_revenue_cents', 0)
            ->where('report.summary.orders_count', 0)
            ->where('report.summary.conversion_rate', 0)
            ->where('report.top_products', [])
            ->where('report.catalog.visits', 0));
});

function reportOrder(
    Manufacturer $manufacturer,
    ?Customer $customer,
    string $createdAt,
    int $totalCents,
    OrderStatus $status = OrderStatus::Delivered,
): Order {
    return Order::factory()
        ->forManufacturer($manufacturer)
        ->when($customer, fn ($factory) => $factory->forCustomer($customer))
        ->create([
            'status' => $status,
            'subtotal_cents' => $totalCents,
            'discount_cents' => 0,
            'total_cents' => $totalCents,
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ]);
}

function reportItem(Order $order, Product $product, int $quantity, string $unitPrice): OrderItem
{
    return OrderItem::factory()->create([
        'order_id' => $order->id,
        'product_id' => $product->id,
        'product_name' => $product->name,
        'product_sku' => $product->sku,
        'unit_price' => $unitPrice,
        'quantity' => $quantity,
    ]);
}

function reportStaff(Manufacturer $manufacturer, array $capabilities): User
{
    $staff = User::factory()->create([
        'user_type' => UserType::ManufacturerUser,
        'current_manufacturer_id' => $manufacturer->id,
    ]);
    $manufacturer->users()->attach($staff->id, [
        'role' => 'staff',
        'status' => 'active',
        'capabilities' => $capabilities,
    ]);

    return $staff;
}
