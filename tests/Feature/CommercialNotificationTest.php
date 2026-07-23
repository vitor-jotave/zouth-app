<?php

use App\Enums\OrderStatus;
use App\Enums\UserType;
use App\Models\CatalogSetting;
use App\Models\Manufacturer;
use App\Models\ManufacturerAffiliation;
use App\Models\Order;
use App\Models\Plan;
use App\Models\Product;
use App\Models\User;
use App\Notifications\NewOrderNotification;
use App\Notifications\OrderAttributedToRepresentativeNotification;
use App\Notifications\OrderReceivedNotification;
use App\Notifications\OrderStatusUpdatedNotification;
use App\Notifications\RepresentativeApplicationReceivedNotification;
use App\Notifications\RepresentativeApplicationStatusNotification;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Notification;

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

it('notifies only active team members who can manage orders', function () {
    Notification::fake();

    $ordersStaff = User::factory()->create([
        'user_type' => UserType::ManufacturerUser,
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);
    $collectionStaff = User::factory()->create([
        'user_type' => UserType::ManufacturerUser,
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);
    $blockedOwner = User::factory()->create([
        'user_type' => UserType::ManufacturerUser,
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);
    $this->manufacturer->users()->attach($ordersStaff, [
        'role' => 'staff',
        'status' => 'active',
        'capabilities' => ['orders.manage'],
    ]);
    $this->manufacturer->users()->attach($collectionStaff, [
        'role' => 'staff',
        'status' => 'active',
        'capabilities' => ['collection.manage'],
    ]);
    $this->manufacturer->users()->attach($blockedOwner, [
        'role' => 'owner',
        'status' => 'blocked',
    ]);

    $this->post(
        route('public.order.store', $this->catalogSetting->public_token),
        ($this->orderPayload)(),
    )->assertRedirect();

    $order = Order::query()->sole();

    Notification::assertSentTo(
        [$this->owner, $ordersStaff],
        NewOrderNotification::class,
        fn (NewOrderNotification $notification): bool => $notification->order->is($order),
    );
    Notification::assertNotSentTo([$collectionStaff, $blockedOwner], NewOrderNotification::class);
});

it('confirms the order to the buyer using an on-demand email', function () {
    Notification::fake();

    $this->post(
        route('public.order.store', $this->catalogSetting->public_token),
        ($this->orderPayload)(),
    )->assertRedirect();

    $order = Order::query()->sole();

    Notification::assertSentOnDemand(
        OrderReceivedNotification::class,
        function (
            OrderReceivedNotification $notification,
            array $channels,
            AnonymousNotifiable $notifiable,
        ) use ($order): bool {
            return $notification->order->is($order)
                && $channels === ['mail']
                && $notifiable->routes['mail'] === [
                    'compras@lojajardim.test' => 'Loja Jardim',
                ];
        },
    );
});

it('does not attempt a buyer email when only a phone number was provided', function () {
    Notification::fake();

    $this->post(
        route('public.order.store', $this->catalogSetting->public_token),
        ($this->orderPayload)(['customer_email' => null]),
    )->assertRedirect();

    Notification::assertSentOnDemandTimes(OrderReceivedNotification::class, 0);
});

it('notifies the representative when an order came through their commercial link', function () {
    Notification::fake();

    $representative = User::factory()->create([
        'user_type' => UserType::SalesRep,
    ]);
    ManufacturerAffiliation::factory()->active()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'user_id' => $representative->id,
    ]);

    $this->post(
        route('public.order.store', [
            'catalogSetting' => $this->catalogSetting->public_token,
            'ref' => $representative->id,
        ]),
        ($this->orderPayload)(),
    )->assertRedirect();

    $order = Order::query()->sole();

    expect($order->sales_rep_id)->toBe($representative->id);

    Notification::assertSentTo(
        $representative,
        OrderAttributedToRepresentativeNotification::class,
        fn (OrderAttributedToRepresentativeNotification $notification): bool => $notification->order->is($order),
    );
});

it('notifies the buyer whenever the manufacturer changes the order status', function () {
    Notification::fake();

    $this->post(
        route('public.order.store', $this->catalogSetting->public_token),
        ($this->orderPayload)(),
    );
    Notification::fake();
    $order = Order::query()->sole();

    $this->actingAs($this->owner)
        ->post(route('manufacturer.orders.update-status', $order), [
            'status' => OrderStatus::Preparing->value,
        ])
        ->assertRedirect();

    Notification::assertSentOnDemand(
        OrderStatusUpdatedNotification::class,
        function (OrderStatusUpdatedNotification $notification) use ($order): bool {
            return $notification->order->is($order)
                && $notification->previousStatus === OrderStatus::New
                && $notification->order->status === OrderStatus::Preparing;
        },
    );
});

it('renders order emails with the commercial summary and Zouth identity', function () {
    $this->post(
        route('public.order.store', $this->catalogSetting->public_token),
        ($this->orderPayload)(),
    );
    $order = Order::query()->with(['manufacturer', 'items'])->sole();
    $message = (new NewOrderNotification($order))->toMail($this->owner);

    $html = view($message->view['html'], $message->viewData)->render();
    $text = view($message->view['text'], $message->viewData)->render();

    expect($html)
        ->toContain('NOVO PEDIDO')
        ->toContain('Loja Jardim')
        ->toContain('Vestido Horizonte')
        ->toContain('R$ 259,80')
        ->toContain('Zouth. Sua coleção em movimento.')
        ->not->toContain('The introduction to the notification.')
        ->and($text)
        ->toContain('Vestido Horizonte')
        ->toContain('Abrir pedido');
});

it('uses quotation language when the selection does not reserve stock', function () {
    Notification::fake();
    $this->product->update([
        'base_quantity' => 0,
        'allow_quote_when_out_of_stock' => true,
    ]);

    $this->post(
        route('public.order.store', $this->catalogSetting->public_token),
        [
            'request_quote' => true,
            'customer_name' => 'Loja Jardim',
            'customer_email' => 'compras@lojajardim.test',
            'items' => [[
                'product_id' => $this->product->id,
                'quantity' => 12,
            ]],
        ],
    )->assertRedirect();

    $order = Order::query()->sole();

    Notification::assertSentTo(
        $this->owner,
        NewOrderNotification::class,
        function (NewOrderNotification $notification): bool {
            $message = $notification->toMail($this->owner);

            return $message->subject === 'Nova solicitação de orçamento de Loja Jardim'
                && $message->viewData['eyebrow'] === 'NOVA SOLICITAÇÃO DE ORÇAMENTO';
        },
    );
    Notification::assertSentOnDemand(OrderReceivedNotification::class);

    expect($order->inventory_reserved_at)->toBeNull();
});

it('notifies the manufacturer about a new representative application', function () {
    Notification::fake();

    $representative = User::factory()->create([
        'name' => 'Camila Nunes',
        'user_type' => UserType::SalesRep,
    ]);

    $this->actingAs($representative)
        ->post(route('rep.manufacturers.affiliate', $this->manufacturer), [
            'whatsapp' => '11988887777',
            'city' => 'Campinas',
            'state' => 'SP',
            'territory' => 'Campinas e região',
            'presentation' => 'Atuo há oito anos com lojistas de moda infantil no interior de São Paulo.',
            'application_note' => 'A coleção combina com a carteira de lojas que acompanho durante o ano inteiro.',
        ])
        ->assertSessionHas('status');

    $affiliation = ManufacturerAffiliation::query()->sole();

    Notification::assertSentTo(
        $this->owner,
        RepresentativeApplicationReceivedNotification::class,
        fn (RepresentativeApplicationReceivedNotification $notification): bool => $notification->affiliation->is($affiliation),
    );
});

it('notifies the representative when the application is approved', function () {
    Notification::fake();

    $representative = User::factory()->create([
        'user_type' => UserType::SalesRep,
    ]);
    $affiliation = ManufacturerAffiliation::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'user_id' => $representative->id,
    ]);

    $this->actingAs($this->owner)
        ->post(route('manufacturer.representatives.approve', $affiliation))
        ->assertSessionHas('status');

    Notification::assertSentTo(
        $representative,
        RepresentativeApplicationStatusNotification::class,
        fn (RepresentativeApplicationStatusNotification $notification): bool => $notification->affiliation->status === 'active',
    );
});
