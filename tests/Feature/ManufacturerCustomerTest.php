<?php

use App\Enums\OrderStatus;
use App\Enums\UserType;
use App\Models\CatalogSetting;
use App\Models\Customer;
use App\Models\Manufacturer;
use App\Models\Order;
use App\Models\Plan;
use App\Models\Product;
use App\Models\User;
use App\Services\CustomerService;

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

    $this->catalogSetting = CatalogSetting::create([
        'manufacturer_id' => $this->manufacturer->id,
        ...CatalogSetting::defaults($this->manufacturer->name),
        'public_link_active' => true,
    ]);

    $this->product = Product::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'is_active' => true,
    ]);

    $this->validPublicOrderPayload = fn (array $overrides = []) => [
        'customer_name' => 'Cliente Teste',
        'customer_phone' => '(11) 99999-9999',
        'customer_email' => 'cliente@example.com',
        'customer_document_type' => 'cpf',
        'customer_document' => '529.982.247-25',
        'customer_zip_code' => '01001-000',
        'customer_state' => 'SP',
        'customer_city' => 'Sao Paulo',
        'customer_neighborhood' => 'Se',
        'customer_street' => 'Praca da Se',
        'customer_address_number' => '100',
        'customer_address_complement' => 'Sala 2',
        'customer_address_reference' => 'Portaria principal',
        'items' => [['product_id' => $this->product->id, 'quantity' => 1]],
        ...$overrides,
    ];
});

it('creates a customer automatically when a public order is created', function () {
    $this->post(
        route('public.order.store', $this->catalogSetting),
        ($this->validPublicOrderPayload)(),
    )->assertRedirect();

    $customer = Customer::first();
    $order = Order::first();

    expect($customer)->not->toBeNull();
    expect($customer->manufacturer_id)->toBe($this->manufacturer->id);
    expect($customer->name)->toBe('Cliente Teste');
    expect($customer->customer_document_type)->toBe('cpf');
    expect($customer->customer_document)->toBe('52998224725');
    expect($customer->phone)->toBe('(11) 99999-9999');
    expect($customer->zip_code)->toBe('01001000');
    expect($order->customer_id)->toBe($customer->id);
});

it('reuses and updates the same customer for repeated public orders with the same document', function () {
    $this->post(route('public.order.store', $this->catalogSetting), ($this->validPublicOrderPayload)())
        ->assertRedirect();

    $this->post(route('public.order.store', $this->catalogSetting), ($this->validPublicOrderPayload)([
        'customer_name' => 'Cliente Atualizado',
        'customer_phone' => '(11) 98888-7777',
        'customer_email' => 'novo@example.com',
        'customer_city' => 'Campinas',
    ]))->assertRedirect();

    $customer = Customer::first();

    expect(Customer::count())->toBe(1);
    expect($customer->name)->toBe('Cliente Atualizado');
    expect($customer->phone)->toBe('(11) 98888-7777');
    expect($customer->email)->toBe('novo@example.com');
    expect($customer->city)->toBe('Campinas');
    expect($customer->orders()->count())->toBe(2);
});

it('keeps customers isolated by manufacturer even when documents match', function () {
    $otherManufacturer = Manufacturer::factory()->create([
        'is_active' => true,
        'current_plan_id' => Plan::factory()->premium()->create()->id,
    ]);
    $otherCatalog = CatalogSetting::create([
        'manufacturer_id' => $otherManufacturer->id,
        ...CatalogSetting::defaults($otherManufacturer->name),
        'public_link_active' => true,
    ]);
    $otherProduct = Product::factory()->create([
        'manufacturer_id' => $otherManufacturer->id,
        'is_active' => true,
    ]);

    $this->post(route('public.order.store', $this->catalogSetting), ($this->validPublicOrderPayload)())
        ->assertRedirect();

    $this->post(route('public.order.store', $otherCatalog), ($this->validPublicOrderPayload)([
        'items' => [['product_id' => $otherProduct->id, 'quantity' => 1]],
    ]))->assertRedirect();

    expect(Customer::count())->toBe(2);
});

it('backfills old orders with documents into deduplicated customers', function () {
    $firstOrder = Order::factory()->forManufacturer($this->manufacturer)->create([
        'customer_id' => null,
        'customer_name' => 'Cliente Antigo',
        'customer_document_type' => 'cpf',
        'customer_document' => '52998224725',
    ]);
    $secondOrder = Order::factory()->forManufacturer($this->manufacturer)->create([
        'customer_id' => null,
        'customer_name' => 'Cliente Antigo Atualizado',
        'customer_document_type' => 'cpf',
        'customer_document' => '52998224725',
    ]);
    $orderWithoutDocument = Order::factory()->forManufacturer($this->manufacturer)->create([
        'customer_id' => null,
        'customer_document_type' => null,
        'customer_document' => null,
    ]);

    app(CustomerService::class)->backfillOrdersWithoutCustomers();

    $customer = Customer::first();

    expect(Customer::count())->toBe(1);
    expect($customer->orders()->count())->toBe(2);
    expect($firstOrder->refresh()->customer_id)->toBe($customer->id);
    expect($secondOrder->refresh()->customer_id)->toBe($customer->id);
    expect($orderWithoutDocument->refresh()->customer_id)->toBeNull();
});

it('lists only customers from the current manufacturer and supports search', function () {
    Customer::factory()->forManufacturer($this->manufacturer)->create([
        'name' => 'Maria Cliente',
        'customer_document' => '52998224725',
    ]);
    $customerWithOrders = Customer::where('customer_document', '52998224725')->first();
    Order::factory()->forCustomer($customerWithOrders)->count(2)->create();

    Customer::factory()->forManufacturer($this->manufacturer)->create([
        'name' => 'Pedro Cliente',
        'customer_document' => '39053344705',
    ]);
    Customer::factory()->create([
        'name' => 'Outra Fabricante',
        'customer_document' => '15350946056',
    ]);

    $response = $this->actingAs($this->owner)
        ->get(route('manufacturer.customers.index', ['search' => 'Maria']));

    $response->assertOk();
    $customers = $response->viewData('page')['props']['customers']['data'];

    expect($customers)->toHaveCount(1);
    expect($customers[0]['name'])->toBe('Maria Cliente');
    expect($customers[0]['orders_count'])->toBe(2);
});

it('shows a customer with every order status in the order history', function () {
    $customer = Customer::factory()->forManufacturer($this->manufacturer)->create();

    Order::factory()->forManufacturer($this->manufacturer)->forCustomer($customer)->status(OrderStatus::New)->create();
    Order::factory()->forManufacturer($this->manufacturer)->forCustomer($customer)->status(OrderStatus::Delivered)->create();
    Order::factory()->forManufacturer($this->manufacturer)->forCustomer($customer)->status(OrderStatus::Cancelled)->create();

    $response = $this->actingAs($this->owner)
        ->get(route('manufacturer.customers.show', $customer));

    $response->assertOk();
    $orders = $response->viewData('page')['props']['orders']['data'];

    expect($orders)->toHaveCount(3);
    expect(collect($orders)->pluck('status')->all())->toContain('new', 'delivered', 'cancelled');
});

it('forbids viewing a customer from another manufacturer', function () {
    $customer = Customer::factory()->create();

    $this->actingAs($this->owner)
        ->get(route('manufacturer.customers.show', $customer))
        ->assertForbidden();
});

it('stores a customer manually', function () {
    $this->actingAs($this->owner)
        ->post(route('manufacturer.customers.store'), [
            'name' => 'Cliente Manual',
            'phone' => '(11) 95555-4444',
            'email' => 'manual@example.com',
            'customer_document_type' => 'cpf',
            'customer_document' => '529.982.247-25',
            'zip_code' => '01001-000',
            'state' => 'SP',
            'city' => 'Sao Paulo',
            'neighborhood' => 'Se',
            'street' => 'Praca da Se',
            'address_number' => '100',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('customers', [
        'manufacturer_id' => $this->manufacturer->id,
        'name' => 'Cliente Manual',
        'customer_document_type' => 'cpf',
        'customer_document' => '52998224725',
        'zip_code' => '01001000',
    ]);
});

it('validates document uniqueness per manufacturer when storing manually', function () {
    Customer::factory()->forManufacturer($this->manufacturer)->create([
        'customer_document_type' => 'cpf',
        'customer_document' => '52998224725',
    ]);

    $this->actingAs($this->owner)
        ->post(route('manufacturer.customers.store'), [
            'name' => 'Duplicado',
            'customer_document_type' => 'cpf',
            'customer_document' => '529.982.247-25',
        ])
        ->assertSessionHasErrors('customer_document');
});

it('updates a customer manually while respecting document uniqueness', function () {
    $customer = Customer::factory()->forManufacturer($this->manufacturer)->create([
        'name' => 'Nome Antigo',
        'customer_document_type' => 'cpf',
        'customer_document' => '52998224725',
    ]);
    Customer::factory()->forManufacturer($this->manufacturer)->create([
        'customer_document_type' => 'cpf',
        'customer_document' => '39053344705',
    ]);

    $this->actingAs($this->owner)
        ->put(route('manufacturer.customers.update', $customer), [
            'name' => 'Nome Novo',
            'customer_document_type' => 'cpf',
            'customer_document' => '529.982.247-25',
            'city' => 'Campinas',
        ])
        ->assertRedirect();

    expect($customer->refresh()->name)->toBe('Nome Novo');
    expect($customer->city)->toBe('Campinas');

    $this->actingAs($this->owner)
        ->put(route('manufacturer.customers.update', $customer), [
            'name' => 'Documento Duplicado',
            'customer_document_type' => 'cpf',
            'customer_document' => '390.533.447-05',
        ])
        ->assertSessionHasErrors('customer_document');
});
