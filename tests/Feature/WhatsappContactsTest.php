<?php

use App\Models\Manufacturer;
use App\Models\Order;
use App\Models\Plan;
use App\Models\User;
use App\Models\WhatsappContactLabel;
use App\Models\WhatsappConversation;
use App\Models\WhatsappInstance;
use App\Models\WhatsappMessage;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
    $this->manufacturer = Manufacturer::factory()->create([
        'is_demo' => true,
        'is_active' => true,
        'current_plan_id' => Plan::factory()->premium(),
    ]);
    $this->owner = User::factory()->create(['user_type' => 'manufacturer_user', 'current_manufacturer_id' => $this->manufacturer->id]);
    $this->manufacturer->users()->attach($this->owner, ['role' => 'owner', 'status' => 'active']);
    $this->instance = WhatsappInstance::factory()->connected()->create(['manufacturer_id' => $this->manufacturer->id]);
});

it('lists only individual local contacts and filters by name, telephone and label', function () {
    $contact = WhatsappConversation::factory()->create([
        'whatsapp_instance_id' => $this->instance->id,
        'contact_name' => 'Boutique Horizonte',
        'remote_jid' => '5511998765432@s.whatsapp.net',
        'contact_phone' => '5511998765432',
    ]);
    WhatsappConversation::factory()->group()->create(['whatsapp_instance_id' => $this->instance->id]);
    WhatsappConversation::factory()->create(['contact_name' => 'Outra marca']);
    $this->actingAs($this->owner)->post(route('manufacturer.atendimento.contacts.labels.store'), ['name' => 'Lead', 'color' => '#ff4d3d'])->assertRedirect();
    $label = WhatsappContactLabel::query()->sole();
    $this->post(route('manufacturer.atendimento.contacts.labels.store'), ['name' => 'LEAD', 'color' => '#123456'])->assertSessionHasErrors('name');
    $this->put(route('manufacturer.atendimento.contacts.labels.update', [$contact, $label]), ['assigned' => true])->assertRedirect();
    $this->put(route('manufacturer.atendimento.contacts.labels.update', [$contact, $label]), ['assigned' => true])->assertRedirect();
    expect($contact->contactLabels()->count())->toBe(1);

    $this->get(route('manufacturer.atendimento.contacts.index', ['search' => '(11) 99876-5432', 'label' => $label->id]))
        ->assertInertia(fn (Assert $page) => $page->component('manufacturer/atendimento/contatos/index')
            ->has('contacts.data', 1)->where('contacts.data.0.id', $contact->id)->where('contacts.data.0.labels.0.name', 'Lead'));
    $this->get(route('manufacturer.atendimento.contacts.index', ['search' => 'horizonte']))
        ->assertInertia(fn (Assert $page) => $page->has('contacts.data', 1));
    $this->get(route('manufacturer.atendimento.index', ['conversation' => $contact->id]))
        ->assertInertia(fn (Assert $page) => $page->has('active_contact_labels', 1)->where('contact_labels.0.name', 'Lead'));

    $this->put(route('manufacturer.atendimento.contacts.labels.update', [$contact, $label]), ['assigned' => false])->assertRedirect();
    $this->get(route('manufacturer.atendimento.contacts.index', ['label' => $label->id]))
        ->assertInertia(fn (Assert $page) => $page->has('contacts.data', 0));
});

it('isolates labels, conversations and orders by manufacturer and capability', function () {
    $contact = WhatsappConversation::factory()->create(['whatsapp_instance_id' => $this->instance->id]);
    $group = WhatsappConversation::factory()->group()->create(['whatsapp_instance_id' => $this->instance->id]);
    $foreignContact = WhatsappConversation::factory()->create();
    $foreignLabel = WhatsappContactLabel::factory()->create();
    $label = WhatsappContactLabel::factory()->create(['manufacturer_id' => $this->manufacturer->id]);
    $foreignOrder = Order::factory()->create();
    $this->actingAs($this->owner)->put(route('manufacturer.atendimento.contacts.labels.update', [$contact, $foreignLabel]), ['assigned' => true])->assertNotFound();
    $this->put(route('manufacturer.atendimento.contacts.labels.update', [$foreignContact, $label]), ['assigned' => true])->assertForbidden();
    $this->put(route('manufacturer.atendimento.contacts.labels.update', [$group, $label]), ['assigned' => true])->assertNotFound();
    $this->post(route('manufacturer.atendimento.orders.open', $foreignOrder))->assertForbidden();

    $staff = User::factory()->create(['user_type' => 'manufacturer_user', 'current_manufacturer_id' => $this->manufacturer->id]);
    $this->manufacturer->users()->attach($staff, ['role' => 'staff', 'status' => 'active', 'capabilities' => ['orders.manage']]);
    $order = Order::factory()->forManufacturer($this->manufacturer)->create();
    $this->actingAs($staff)->get(route('manufacturer.atendimento.contacts.index'))->assertForbidden();
    $this->post(route('manufacturer.atendimento.orders.open', $order))->assertForbidden();
    $this->get(route('manufacturer.orders.show', $order))->assertInertia(fn (Assert $page) => $page->where('whatsapp_contact', null));
    $this->manufacturer->users()->updateExistingPivot($staff, ['capabilities' => ['whatsapp.manage']]);
    $this->post(route('manufacturer.atendimento.orders.open', $order))->assertForbidden();
});

it('opens an existing conversation when phone formatting differs without creating or sending anything', function () {
    Http::fake();
    $contact = WhatsappConversation::factory()->create([
        'whatsapp_instance_id' => $this->instance->id,
        'remote_jid' => '11998765432@c.us',
        'contact_phone' => '(11) 99876-5432',
    ]);
    $order = Order::factory()->forManufacturer($this->manufacturer)->create(['customer_phone' => '+55 (11) 99876-5432']);
    $this->actingAs($this->owner)->post(route('manufacturer.atendimento.orders.open', $order))
        ->assertRedirect(route('manufacturer.atendimento.index', ['conversation' => $contact->id]));
    expect(WhatsappConversation::query()->count())->toBe(1)->and(WhatsappMessage::query()->count())->toBe(0);
    Http::assertNothingSent();
});

it('makes a single empty conversation for a new phone and reuses it from other orders', function () {
    Http::fake();
    $orders = Order::factory()->forManufacturer($this->manufacturer)->count(2)->create(['customer_phone' => '(11) 99876-5432']);
    $this->actingAs($this->owner)->post(route('manufacturer.atendimento.orders.open', $orders[0]))->assertRedirect();
    $contact = WhatsappConversation::query()->sole();
    expect($contact->remote_jid)->toBe('5511998765432@s.whatsapp.net')->and($contact->last_message_at)->toBeNull();
    $this->post(route('manufacturer.atendimento.orders.open', $orders[1]))
        ->assertRedirect(route('manufacturer.atendimento.index', ['conversation' => $contact->id]));
    Http::assertNothingSent();
    $this->get(route('manufacturer.atendimento.index', ['conversation' => $contact->id]))
        ->assertInertia(fn (Assert $page) => $page->where('active_conversation.id', $contact->id)->has('messages', 0));
    expect(WhatsappConversation::query()->count())->toBe(1)->and(WhatsappMessage::query()->count())->toBe(0);
    Http::assertNotSent(fn ($request): bool => str_contains($request->url(), '/message/send'));
});

it('explains a missing phone and a disconnected channel without opening a conversation', function () {
    $order = Order::factory()->forManufacturer($this->manufacturer)->create(['customer_phone' => null]);
    $this->actingAs($this->owner)->get(route('manufacturer.orders.show', $order))->assertInertia(fn (Assert $page) => $page
        ->where('whatsapp_contact.valid_phone', false)->where('whatsapp_contact.connected', true));
    $this->post(route('manufacturer.atendimento.orders.open', $order))->assertSessionHasErrors('atendimento');
    $order->update(['customer_phone' => '(11) 99876-5432']);
    $this->instance->update(['status' => 'disconnected']);
    $this->get(route('manufacturer.orders.show', $order))->assertInertia(fn (Assert $page) => $page
        ->where('whatsapp_contact.valid_phone', true)->where('whatsapp_contact.connected', false));
    $this->post(route('manufacturer.atendimento.orders.open', $order))->assertSessionHasErrors('atendimento');
    expect(WhatsappConversation::query()->count())->toBe(0);
});

it('shows the phone for historical conversations saved with the manufacturer or channel name', function (string $ownName) {
    $this->manufacturer->update(['name' => 'Minha Marca']);
    $this->instance->update(['profile_name' => 'Atendimento da Marca']);
    $conversation = WhatsappConversation::factory()->create([
        'whatsapp_instance_id' => $this->instance->id,
        'contact_name' => $ownName,
        'remote_jid' => '5511999887766@s.whatsapp.net',
        'contact_phone' => '5511999887766',
    ]);

    $this->actingAs($this->owner)->get(route('manufacturer.atendimento.index', ['conversation' => $conversation->id]))
        ->assertInertia(fn (Assert $page) => $page->where('active_conversation.display_name', '5511999887766')
            ->where('conversations.0.display_name', '5511999887766'));
    $this->getJson(route('manufacturer.atendimento.conversations.list'))
        ->assertJsonPath('conversations.0.display_name', '5511999887766');
    $this->get(route('manufacturer.atendimento.contacts.index'))
        ->assertInertia(fn (Assert $page) => $page->where('contacts.data.0.name', '5511999887766'));
    expect($conversation->fresh()->contact_name)->toBe($ownName);
})->with(['MINHA MARCA', 'Atendimento da Marca']);
