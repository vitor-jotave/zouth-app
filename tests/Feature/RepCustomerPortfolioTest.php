<?php

use App\Enums\OrderStatus;
use App\Enums\OrderType;
use App\Enums\UserType;
use App\Models\Customer;
use App\Models\Manufacturer;
use App\Models\ManufacturerAffiliation;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
    $this->rep = User::factory()->create(['user_type' => UserType::SalesRep]);
});

it('isolates portfolio totals and history by representative, even after revocation', function () {
    $brand = Manufacturer::factory()->create();
    $otherBrand = Manufacturer::factory()->create();
    $customer = Customer::factory()->forManufacturer($brand)->create(['name' => 'Loja Aurora']);
    $sameName = Customer::factory()->forManufacturer($otherBrand)->create(['name' => $customer->name]);
    $unowned = Customer::factory()->forManufacturer($brand)->create();
    $otherRep = User::factory()->create(['user_type' => UserType::SalesRep]);
    ManufacturerAffiliation::factory()->create(['manufacturer_id' => $brand->id, 'user_id' => $this->rep->id, 'status' => 'revoked']);

    $owned = Order::factory()->forCustomer($customer)->state(['sales_rep_id' => $this->rep->id]);
    $sale = $owned->status(OrderStatus::Confirmed)->create(['total_cents' => 12000]);
    $legacyPrice = $owned->status(OrderStatus::Shipped)->create(['discount_cents' => 100]);
    OrderItem::factory()->create(['order_id' => $legacyPrice->id, 'unit_price' => '12.00', 'quantity' => 2]);
    $owned->status(OrderStatus::Cancelled)->create(['total_cents' => 90000]);
    $owned->create(['order_type' => OrderType::Quote, 'total_cents' => 90000]);
    $otherSale = Order::factory()->forCustomer($customer)->create(['sales_rep_id' => $otherRep->id, 'total_cents' => 80000]);
    Order::factory()->forCustomer($customer)->create(['total_cents' => 70000]);
    Order::factory()->forCustomer($unowned)->create(['sales_rep_id' => $otherRep->id]);
    Order::factory()->forCustomer($sameName)->create(['sales_rep_id' => $this->rep->id]);
    Order::factory()->forManufacturer($brand)->create(['sales_rep_id' => $this->rep->id, 'customer_name' => 'Cliente legado']);

    $this->actingAs($this->rep)->get(route('rep.customers.index', ['search' => 'Aurora']))
        ->assertInertia(fn (Assert $page) => $page->has('customers.data', 2));
    $this->get(route('rep.customers.index', ['search' => 'Aurora', 'brand' => $brand->id]))
        ->assertInertia(fn (Assert $page) => $page->component('rep/customers/index')
            ->has('customers.data', 1)->where('customers.data.0.orders_count', 3)
            ->where('customers.data.0.quotes_count', 1)->where('customers.data.0.net_cents', 14300)
            ->missing('customers.data.0.email')->missing('customers.data.0.phone')->has('customers.data.0.last_order_at'));
    $this->get(route('rep.customers.index', ['search' => 'Cliente legado']))
        ->assertInertia(fn (Assert $page) => $page->has('customers.data', 0));
    $this->get(route('rep.customers.show', $customer))
        ->assertInertia(fn (Assert $page) => $page->component('rep/customers/show')
            ->where('customer.id', $customer->id)->has('orders.data', 3)->has('quotes.data', 1)
            ->where('quotes.data.0.total_amount', null)->where('net_cents', 14300)
            ->missing('customer.phone')->missing('customer.email')->missing('customer.customer_document')
            ->missing('orders.data.0.internal_notes'));
    $this->get(route('rep.customers.show', $unowned))->assertNotFound();
    $this->get(route('rep.orders.show', ['order' => $sale, 'from_customer' => $customer->id]))
        ->assertInertia(fn (Assert $page) => $page->where('from_customer.id', $customer->id));
    $this->get(route('rep.orders.show', $otherSale))->assertNotFound();
    $this->get(route('rep.dashboard'))->assertInertia(fn (Assert $page) => $page
        ->where('stats.portfolio_customers', 2)->where('stats.orders_in_progress', 2));
    $this->get(route('rep.orders.index', ['status' => 'in_progress']))
        ->assertInertia(fn (Assert $page) => $page->has('orders.data', 2)->has('stages', 3));

    $this->actingAs($otherRep)->get(route('rep.customers.show', $customer))
        ->assertInertia(fn (Assert $page) => $page->has('orders.data', 1)
            ->where('orders.data.0.id', $otherSale->id)->has('quotes.data', 0)->where('net_cents', 80000));
});

it('updates the shared commercial profile without changing affiliations', function () {
    $affiliation = ManufacturerAffiliation::factory()->active()->create(['user_id' => $this->rep->id]);
    $values = ['whatsapp' => '11999999999', 'city' => 'São Paulo', 'state' => 'sp', 'territory' => 'Sudeste', 'presentation' => 'Atendo lojistas de moda no estado de São Paulo.'];

    $this->actingAs($this->rep)->patch(route('rep.commercial-profile.update'), $values + ['user_id' => 999])
        ->assertRedirect(route('rep.commercial-profile.edit'));
    $this->patch(route('rep.commercial-profile.update'), [...$values, 'presentation' => 'Curta'])
        ->assertSessionHasErrors('presentation');
    $this->get(route('rep.commercial-profile.edit'))->assertInertia(fn (Assert $page) => $page
        ->component('rep/commercial-profile')->where('profile.state', 'SP')->where('profile.city', $values['city']));
    $this->get(route('rep.manufacturers.index'))->assertInertia(fn (Assert $page) => $page
        ->where('profile.presentation', $values['presentation']));
    expect($affiliation->fresh()->status)->toBe('active');
});

it('keeps portfolio and commercial profile behind representative authorization', function () {
    $this->get(route('rep.customers.index'))->assertRedirect(route('login'));
    $manufacturer = User::factory()->create(['user_type' => UserType::ManufacturerUser]);
    $this->actingAs($manufacturer)->get(route('rep.customers.index'))->assertForbidden();
    $this->get(route('rep.commercial-profile.edit'))->assertForbidden();
    $this->patch(route('rep.commercial-profile.update'))->assertForbidden();
});

it('returns an empty portfolio and zero counters for a new representative', function () {
    $this->actingAs($this->rep)->get(route('rep.customers.index'))
        ->assertInertia(fn (Assert $page) => $page->has('customers.data', 0)->has('brands', 0));

    $this->get(route('rep.dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('stats.portfolio_customers', 0)->where('stats.orders_in_progress', 0));
});
