<?php

use App\Enums\UserType;
use App\Models\AssistedSelection;
use App\Models\CatalogSetting;
use App\Models\Manufacturer;
use App\Models\ManufacturerAffiliation;
use App\Models\Order;
use App\Models\OrderRule;
use App\Models\Plan;
use App\Models\Product;
use App\Models\ProductVariantStock;
use App\Models\ProductVariation;
use App\Models\User;
use App\Models\VariationType;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();

    $plan = Plan::factory()->premium()->create();
    $this->manufacturer = Manufacturer::factory()->create([
        'name' => 'Petit Monde',
        'current_plan_id' => $plan->id,
    ]);
    $this->owner = User::factory()->create([
        'name' => 'Marina',
        'user_type' => UserType::ManufacturerUser,
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);
    $this->manufacturer->users()->attach($this->owner, [
        'role' => 'owner',
        'status' => 'active',
    ]);
    $this->manufacturer->update([
        'primary_owner_user_id' => $this->owner->id,
    ]);
    $this->catalogSetting = CatalogSetting::create([
        'manufacturer_id' => $this->manufacturer->id,
        ...CatalogSetting::defaults($this->manufacturer->name),
        'public_link_active' => true,
    ]);
    $this->product = Product::factory()
        ->withoutCategory()
        ->forManufacturer($this->manufacturer)
        ->create([
            'name' => 'Vestido Horizonte',
            'sku' => 'VH-001',
            'price_cents' => 12990,
            'base_quantity' => 20,
        ]);
    Notification::fake();
    $this->representative = User::factory()->create(['user_type' => UserType::SalesRep]);
    $this->affiliation = ManufacturerAffiliation::factory()->active()->create([
        'manufacturer_id' => $this->manufacturer->id, 'user_id' => $this->representative->id,
    ]);
    $this->orderPayload = fn (array $overrides = []): array => [
        'customer_name' => 'Loja Jardim',
        'customer_phone' => '(11) 99999-9999',
        'customer_email' => 'compras@lojajardim.test',
        'customer_document_type' => 'cnpj',
        'customer_document' => '11.222.333/0001-81',
        'customer_zip_code' => '01001000',
        'customer_state' => 'SP',
        'customer_city' => 'São Paulo',
        'customer_neighborhood' => 'Sé',
        'customer_street' => 'Praça da Sé',
        'customer_address_number' => '100',
        'items' => [[
            'product_id' => $this->product->id,
            'quantity' => 2,
        ]],
        ...$overrides,
    ];
});

it('shares a selection without reserving stock and checks the current price and attribution on checkout', function () {
    $this->actingAs($this->representative)->postJson(route('rep.assisted-selections.store', $this->catalogSetting->public_token), [
        'items' => ($this->orderPayload)()['items'],
    ])->assertCreated();

    $selection = AssistedSelection::query()->sole();
    expect(Order::query()->count())->toBe(0)->and($this->product->fresh()->base_quantity)->toBe(20);
    $otherRep = User::factory()->create(['user_type' => UserType::SalesRep]);
    $otherAffiliation = ManufacturerAffiliation::factory()->active()->create([
        'manufacturer_id' => $this->manufacturer->id, 'user_id' => $otherRep->id,
    ]);
    auth()->forgetGuards();
    $this->get(route('public.catalog.show', ['token' => $this->catalogSetting->public_token, 'selecao' => $selection->token]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('assisted_selection.token', $selection->token)
            ->where('assisted_selection.items.0.quantity', 2)->missing('assisted_selection.items.0.unit_price_cents')
            ->where('representative_share_url', null));
    $this->product->update(['price_cents' => 50000, 'base_quantity' => 1]);
    $checkout = route('public.order.store', [
        'catalogSetting' => $this->catalogSetting->public_token, 'selecao' => $selection->token, 'ref' => $otherAffiliation->tracking_token,
    ]);
    $this->post($checkout, ($this->orderPayload)())->assertSessionHasErrors('items');
    expect(Order::query()->count())->toBe(0)->and($this->product->fresh()->base_quantity)->toBe(1);

    $this->product->update(['base_quantity' => 4]);
    $rule = OrderRule::factory()->blocking()->create(['manufacturer_id' => $this->manufacturer->id]);
    $this->post($checkout, ($this->orderPayload)())->assertSessionHasErrors('order_rules');
    expect(Order::query()->count())->toBe(0)->and($this->product->fresh()->base_quantity)->toBe(4);
    $rule->update(['is_active' => false]);

    $this->post($checkout, ($this->orderPayload)())->assertRedirect()->assertSessionHasNoErrors();
    $order = Order::query()->sole();
    expect($order->sales_rep_id)->toBe($this->representative->id)
        ->and($order->tracking_ref)->toBe($this->affiliation->tracking_token)
        ->and($order->total_cents)->toBe(100000)
        ->and($this->product->fresh()->base_quantity)->toBe(2);
    $this->actingAs($this->representative)->get(route('rep.orders.show', $order))->assertOk();
    $this->actingAs($otherRep)->get(route('rep.orders.show', $order))->assertNotFound();
});

it('requires an active affiliation and rejects foreign items', function () {
    $url = route('rep.assisted-selections.store', $this->catalogSetting->public_token);
    $stranger = User::factory()->create(['user_type' => UserType::SalesRep]);
    $items = ($this->orderPayload)()['items'];

    $this->actingAs($stranger)->postJson($url, ['items' => $items])->assertNotFound();
    $foreignProduct = Product::factory()->create();
    $this->actingAs($this->representative)->postJson($url, [
        'items' => [['product_id' => $foreignProduct->id, 'quantity' => 1]],
    ])->assertUnprocessable()->assertJsonValidationErrors('items');
    $this->postJson($url, ['items' => [$items[0], $items[0]]])->assertUnprocessable();
    expect(AssistedSelection::query()->count())->toBe(0);
});

it('keeps variation and quantity in the link and reserves only the selected variant at checkout', function () {
    $variation = VariationType::factory()->create(['manufacturer_id' => $this->manufacturer->id, 'name' => 'Cor']);
    ProductVariation::create(['product_id' => $this->product->id, 'variation_type_id' => $variation->id]);
    $stock = ProductVariantStock::factory()->create([
        'product_id' => $this->product->id,
        'variation_key' => ['Cor' => 'Azul'],
        'quantity' => 3,
        'price_cents' => 9000,
    ]);
    $items = [['product_id' => $this->product->id, 'quantity' => 2, 'selected_variations' => ['Cor' => 'Azul']]];
    $response = $this->actingAs($this->representative)
        ->postJson(route('rep.assisted-selections.store', $this->catalogSetting->public_token), ['items' => $items])
        ->assertCreated();
    expect($stock->fresh()->quantity)->toBe(3);

    $selection = AssistedSelection::query()->sole();
    auth()->forgetGuards();
    $this->get($response->json('url'))->assertInertia(fn (Assert $page) => $page
        ->where('assisted_selection.items.0.selected_variations.Cor', 'Azul')->where('assisted_selection.items.0.quantity', 2));

    $this->post(route('public.order.store', ['catalogSetting' => $this->catalogSetting->public_token, 'selecao' => $selection->token]), ($this->orderPayload)(['items' => $items]))
        ->assertRedirect()->assertSessionHasNoErrors();
    $order = Order::query()->sole();
    expect($stock->fresh()->quantity)->toBe(1)
        ->and($order->items()->sole()->selected_variations)->toBe(['Cor' => 'Azul'])
        ->and($order->total_cents)->toBe(18000);
});

it('refuses expired, revoked, mismatched or WhatsApp-only selection links', function (string $scenario) {
    $this->actingAs($this->representative)->postJson(route('rep.assisted-selections.store', $this->catalogSetting->public_token), [
        'items' => ($this->orderPayload)()['items'],
    ])->assertCreated();
    $selection = AssistedSelection::query()->sole();
    $token = $this->catalogSetting->public_token;
    match ($scenario) {
        'expired' => $selection->update(['expires_at' => now()->subSecond()]),
        'revoked' => $this->affiliation->update(['status' => 'revoked']),
        'mismatched' => $selection->update(['catalog_setting_id' => CatalogSetting::factory()->create()->id]),
        'whatsapp' => $this->catalogSetting->update(['hide_prices' => true]),
    };
    auth()->forgetGuards();

    $this->get(route('public.catalog.show', ['token' => $token, 'selecao' => $selection->token]))
        ->assertInertia(fn (Assert $page) => $page->where('assisted_selection', null)->where('assisted_selection_unavailable', true));
    $this->post(route('public.order.store', ['catalogSetting' => $token, 'selecao' => $selection->token]), ($this->orderPayload)())
        ->assertSessionHasErrors('checkout');
    expect(Order::query()->count())->toBe(0);
})->with(['expired', 'revoked', 'mismatched', 'whatsapp']);
