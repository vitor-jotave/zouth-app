<?php

use App\Models\CatalogSetting;
use App\Models\Manufacturer;
use App\Models\Order;
use App\Models\OrderRule;
use App\Models\Plan;
use App\Models\Product;
use Inertia\Testing\AssertableInertia as Assert;

function checkoutPayload(Product $product, int $quantity = 1, array $overrides = []): array
{
    return [
        'customer_name' => 'Loja Aurora',
        'customer_phone' => '(11) 99999-9999',
        'customer_document_type' => 'cpf',
        'customer_document' => '529.982.247-25',
        'customer_zip_code' => '01001-000',
        'customer_state' => 'SP',
        'customer_city' => 'São Paulo',
        'customer_neighborhood' => 'Sé',
        'customer_street' => 'Praça da Sé',
        'customer_address_number' => '100',
        'items' => [[
            'product_id' => $product->id,
            'quantity' => $quantity,
        ]],
        ...$overrides,
    ];
}

beforeEach(function () {
    $this->withoutVite();

    $plan = Plan::factory()->premium()->create();
    $this->manufacturer = Manufacturer::factory()->create([
        'is_active' => true,
        'current_plan_id' => $plan->id,
    ]);
    $this->catalogSetting = CatalogSetting::create([
        'manufacturer_id' => $this->manufacturer->id,
        ...CatalogSetting::defaults($this->manufacturer->name),
        'public_link_active' => true,
    ]);
    $this->product = Product::factory()->forManufacturer($this->manufacturer)->create([
        'product_category_id' => null,
        'price_cents' => 10000,
        'base_quantity' => 10,
        'is_active' => true,
    ]);

    OrderRule::factory()->for($this->manufacturer)->blocking()->create([
        'conditions' => [[
            'metric' => 'subtotal_cents',
            'operator' => 'lte',
            'value' => 19999,
            'max_value' => null,
            'scope_type' => null,
            'scope_ids' => [],
        ]],
        'public_message' => 'O pedido mínimo é de R$ 200.',
    ]);

    OrderRule::factory()->for($this->manufacturer)->create([
        'name' => 'Desconto de lançamento',
        'conditions' => [[
            'metric' => 'subtotal_cents',
            'operator' => 'gte',
            'value' => 20000,
            'max_value' => null,
            'scope_type' => null,
            'scope_ids' => [],
        ]],
        'action' => [
            'type' => 'percentage_discount',
            'value' => 1000,
        ],
    ]);
});

it('does not create or reserve stock for an order below a blocking limit', function () {
    $this->post(
        route('public.order.store', $this->catalogSetting),
        checkoutPayload($this->product),
    )->assertSessionHasErrors('order_rules');

    expect(Order::query()->count())->toBe(0)
        ->and($this->product->fresh()->base_quantity)->toBe(10);
});

it('exposes only active tenant rules through the safe catalog contract', function () {
    OrderRule::factory()->for($this->manufacturer)->create([
        'name' => 'Regra pausada',
        'is_active' => false,
    ]);
    OrderRule::factory()->create(['name' => 'Regra estrangeira']);

    $this->get(route('public.catalog.show', $this->catalogSetting->public_token))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('order_rules', 2)
            ->has('order_rules.0', fn (Assert $rule) => $rule
                ->hasAll([
                    'id',
                    'name',
                    'match_mode',
                    'conditions',
                    'action',
                    'public_message',
                ]))
            ->where('order_rules.0.name', 'Pedido mínimo')
            ->where('order_rules.1.name', 'Desconto de lançamento'));
});

it('exposes only quantity guidance when prices are hidden', function () {
    $this->catalogSetting->update(['hide_prices' => true]);

    OrderRule::factory()->for($this->manufacturer)->blocking()->create([
        'name' => 'Variedade mínima',
        'conditions' => [[
            'metric' => 'distinct_products',
            'operator' => 'lte',
            'value' => 2,
            'max_value' => null,
            'scope_type' => null,
            'scope_ids' => [],
        ]],
        'public_message' => 'Escolha pelo menos três modelos.',
    ]);

    $this->get(route('public.catalog.show', $this->catalogSetting->public_token))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('order_rules', 1)
            ->where('order_rules.0.name', 'Variedade mínima')
            ->where('order_rules.0.conditions.0.metric', 'distinct_products')
            ->where('order_rules.0.action.type', 'block_checkout')
        );
});

it('rejects direct order creation without reserving stock when prices are hidden', function () {
    $this->catalogSetting->update(['hide_prices' => true]);

    $this->post(
        route('public.order.store', $this->catalogSetting),
        checkoutPayload($this->product, 2),
    )->assertSessionHasErrors('checkout');

    expect(Order::query()->count())->toBe(0)
        ->and($this->product->fresh()->base_quantity)->toBe(10);
});

it('persists trusted subtotal discount total and the applied rule snapshot', function () {
    $this->post(
        route('public.order.store', $this->catalogSetting),
        checkoutPayload($this->product, 2),
    )->assertRedirect();

    $order = Order::query()->firstOrFail();

    expect($order->subtotal_cents)->toBe(20000)
        ->and($order->discount_cents)->toBe(2000)
        ->and($order->total_cents)->toBe(18000)
        ->and($order->applied_order_rules)->toHaveCount(1)
        ->and($order->applied_order_rules[0]['name'])->toBe('Desconto de lançamento')
        ->and($order->items)->toHaveCount(1)
        ->and($this->product->fresh()->base_quantity)->toBe(8);
});

it('ignores subtotal discount total and rule data sent by the browser', function () {
    $this->post(
        route('public.order.store', $this->catalogSetting),
        checkoutPayload($this->product, 2, [
            'subtotal_cents' => 1,
            'discount_cents' => 999999,
            'total_cents' => 1,
            'applied_order_rules' => [['id' => 999]],
        ]),
    )->assertRedirect();

    $order = Order::query()->firstOrFail();

    expect($order->subtotal_cents)->toBe(20000)
        ->and($order->discount_cents)->toBe(2000)
        ->and($order->total_cents)->toBe(18000)
        ->and($order->applied_order_rules[0]['id'])->not->toBe(999);
});

it('keeps old orders readable through the pricing fallback', function () {
    $order = Order::factory()->forManufacturer($this->manufacturer)->create([
        'subtotal_cents' => null,
        'discount_cents' => null,
        'total_cents' => null,
    ]);
    $order->items()->create([
        'product_id' => $this->product->id,
        'product_name' => $this->product->name,
        'product_sku' => $this->product->sku,
        'unit_price' => 100.00,
        'quantity' => 2,
    ]);

    expect($order->refresh()->subtotalCents())->toBe(20000)
        ->and($order->totalCents())->toBe(20000)
        ->and($order->totalAmount())->toBe(200.0);
});
