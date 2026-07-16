<?php

use App\Enums\OrderStatus;
use App\Models\CatalogSetting;
use App\Models\CatalogVisit;
use App\Models\Customer;
use App\Models\Manufacturer;
use App\Models\ManufacturerAffiliation;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Plan;
use App\Models\Product;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

it('shows tenant scoped operational metrics on the manufacturer dashboard', function () {
    $this->withoutVite();

    $plan = Plan::factory()->create(['name' => 'Profissional']);
    $manufacturer = Manufacturer::factory()->create(['current_plan_id' => $plan->id]);
    $otherManufacturer = Manufacturer::factory()->create();
    $user = User::factory()->create([
        'user_type' => 'manufacturer_user',
        'current_manufacturer_id' => $manufacturer->id,
    ]);
    $manufacturer->users()->attach($user->id, ['role' => 'owner', 'status' => 'active']);

    Product::factory()->forManufacturer($manufacturer)->withoutCategory()->count(2)->create();
    Product::factory()->forManufacturer($manufacturer)->withoutCategory()->create(['is_active' => false]);
    Product::factory()->forManufacturer($otherManufacturer)->withoutCategory()->count(3)->create();
    Customer::factory()->forManufacturer($manufacturer)->count(2)->create();

    $setting = CatalogSetting::factory()->forManufacturer($manufacturer)->create();
    CatalogVisit::factory()->forCatalogSetting($setting)->count(3)->create(['visited_at' => now()->subDays(2)]);
    CatalogVisit::factory()->forCatalogSetting($setting)->create(['visited_at' => now()->subDays(40)]);

    $newOrder = Order::factory()->forManufacturer($manufacturer)->create([
        'customer_name' => 'Cliente recente',
        'status' => OrderStatus::New,
    ]);
    OrderItem::factory()->for($newOrder)->create([
        'product_id' => null,
        'unit_price' => 50,
        'quantity' => 2,
    ]);

    $cancelledOrder = Order::factory()->forManufacturer($manufacturer)->create([
        'status' => OrderStatus::Cancelled,
    ]);
    OrderItem::factory()->for($cancelledOrder)->create([
        'product_id' => null,
        'unit_price' => 999,
        'quantity' => 1,
    ]);

    Order::factory()->forManufacturer($otherManufacturer)->count(4)->create();

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('manufacturer.name', $manufacturer->name)
            ->where('manufacturer.plan_name', 'Profissional')
            ->where('stats.orders_total', 2)
            ->where('stats.orders_this_month', 2)
            ->where('stats.new_orders', 1)
            ->where('stats.customers', 2)
            ->where('stats.active_products', 2)
            ->where('stats.catalog_visits_30_days', 3)
            ->where('stats.gross_revenue', 100)
            ->has('recentOrders', 2)
            ->where('recentOrders', fn ($orders) => collect($orders)
                ->pluck('customer_name')
                ->contains('Cliente recente'))
        );
});

it('shows a Stripe plan on the manufacturer dashboard only with entitlement', function () {
    $this->withoutVite();

    $plan = Plan::factory()->withStripe()->create(['name' => 'Com assinatura']);
    $manufacturer = Manufacturer::factory()->create(['current_plan_id' => $plan->id]);
    $user = User::factory()->create([
        'user_type' => 'manufacturer_user',
        'current_manufacturer_id' => $manufacturer->id,
    ]);
    $manufacturer->users()->attach($user->id, ['role' => 'owner', 'status' => 'active']);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('manufacturer.plan_name', null)
        );

    $manufacturer->subscriptions()->create([
        'type' => 'default',
        'stripe_id' => 'sub_dashboard_entitled',
        'stripe_status' => 'active',
        'stripe_price' => $plan->stripe_price_id,
    ]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('manufacturer.plan_name', 'Com assinatura')
        );
});

it('shows platform revenue and recent accounts on the admin dashboard', function () {
    $this->withoutVite();

    $plan = Plan::factory()->withStripe()->create(['monthly_price_cents' => 12990]);
    $subscriber = Manufacturer::factory()->create(['current_plan_id' => $plan->id]);
    $subscriber->subscriptions()->create([
        'type' => 'default',
        'stripe_id' => 'sub_dashboard_active',
        'stripe_status' => 'active',
        'stripe_price' => $plan->stripe_price_id,
    ]);
    $inactiveManufacturer = Manufacturer::factory()->inactive()->create();
    $manufacturerWithoutEntitlement = Manufacturer::factory()->create([
        'current_plan_id' => $plan->id,
    ]);

    User::factory()->count(2)->create(['user_type' => 'sales_rep']);
    $admin = User::factory()->create(['user_type' => 'superadmin']);

    $order = Order::factory()->forManufacturer($subscriber)->create();
    OrderItem::factory()->for($order)->create([
        'product_id' => null,
        'unit_price' => 80,
        'quantity' => 3,
    ]);

    $this->actingAs($admin)
        ->get(route('admin.dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/dashboard')
            ->where('stats.active_manufacturers', 2)
            ->where('stats.total_manufacturers', 3)
            ->where('stats.paying_manufacturers', 1)
            ->where('stats.monthly_recurring_revenue', 129.9)
            ->where('stats.sales_reps', 2)
            ->where('stats.orders_last_30_days', 1)
            ->where('stats.volume_last_30_days', 240)
            ->has('recentManufacturers', 3)
            ->where('recentManufacturers', fn ($manufacturers) => collect($manufacturers)
                ->pluck('id')
                ->contains($inactiveManufacturer->id))
            ->where('recentManufacturers', fn ($manufacturers) => collect($manufacturers)
                ->firstWhere('id', $subscriber->id)['plan_name'] === $plan->name)
            ->where('recentManufacturers', fn ($manufacturers) => collect($manufacturers)
                ->firstWhere('id', $manufacturerWithoutEntitlement->id)['plan_name'] === null)
        );
});

it('shows only attributed activity on the sales rep dashboard', function () {
    $this->withoutVite();

    $representative = User::factory()->create(['user_type' => 'sales_rep']);
    $otherRepresentative = User::factory()->create(['user_type' => 'sales_rep']);
    $activeManufacturer = Manufacturer::factory()->create();
    $pendingManufacturer = Manufacturer::factory()->create();
    Manufacturer::factory()->create();
    Manufacturer::factory()->inactive()->create();

    ManufacturerAffiliation::factory()->active()->create([
        'user_id' => $representative->id,
        'manufacturer_id' => $activeManufacturer->id,
    ]);
    ManufacturerAffiliation::factory()->create([
        'user_id' => $representative->id,
        'manufacturer_id' => $pendingManufacturer->id,
        'status' => 'pending',
    ]);

    $attributedOrder = Order::factory()->forManufacturer($activeManufacturer)->create([
        'sales_rep_id' => $representative->id,
        'customer_name' => 'Cliente do representante',
    ]);
    OrderItem::factory()->for($attributedOrder)->create([
        'product_id' => null,
        'unit_price' => 75,
        'quantity' => 2,
    ]);

    $otherOrder = Order::factory()->forManufacturer($activeManufacturer)->create([
        'sales_rep_id' => $otherRepresentative->id,
    ]);
    OrderItem::factory()->for($otherOrder)->create([
        'product_id' => null,
        'unit_price' => 500,
        'quantity' => 1,
    ]);

    $this->actingAs($representative)
        ->get(route('rep.dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('rep/dashboard')
            ->where('stats.active_affiliations', 1)
            ->where('stats.pending_affiliations', 1)
            ->where('stats.orders_total', 1)
            ->where('stats.orders_this_month', 1)
            ->where('stats.gross_sales', 150)
            ->where('stats.available_manufacturers', 1)
            ->has('recentOrders', 1)
            ->where('recentOrders.0.customer_name', 'Cliente do representante')
        );
});
