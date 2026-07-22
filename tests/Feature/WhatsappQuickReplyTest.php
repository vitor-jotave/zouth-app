<?php

use App\Models\Manufacturer;
use App\Models\User;
use App\Models\WhatsappQuickReply;

function createWhatsappQuickReplyContext(): array
{
    $manufacturer = Manufacturer::factory()->create(['is_active' => true]);
    $user = User::factory()->create([
        'user_type' => 'manufacturer_user',
        'current_manufacturer_id' => $manufacturer->id,
    ]);
    $manufacturer->users()->attach($user->id, [
        'role' => 'owner',
        'status' => 'active',
    ]);

    return [$user, $manufacturer];
}

it('shows only the current manufacturer quick replies', function () {
    $this->withoutVite();
    [$user, $manufacturer] = createWhatsappQuickReplyContext();
    $quickReply = WhatsappQuickReply::factory()->for($manufacturer)->create([
        'shortcut' => 'catalogo',
        'title' => 'Enviar catálogo',
    ]);
    WhatsappQuickReply::factory()->create(['shortcut' => 'outra-marca']);

    $this->actingAs($user)
        ->get('/manufacturer/atendimento/mensagens-rapidas')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('manufacturer/atendimento/mensagens-rapidas/index')
            ->has('quick_replies', 1)
            ->where('quick_replies.0.id', $quickReply->id)
            ->where('quick_replies.0.shortcut', 'catalogo')
        );
});

it('creates a normalized quick reply for the current manufacturer', function () {
    [$user, $manufacturer] = createWhatsappQuickReplyContext();

    $this->actingAs($user)
        ->post('/manufacturer/atendimento/mensagens-rapidas', [
            'shortcut' => '{Catálogo}',
            'title' => 'Enviar coleção completa',
            'body' => 'Claro! Separei nosso catálogo digital para você.',
            'is_active' => true,
        ])
        ->assertRedirect();

    $quickReply = WhatsappQuickReply::query()->sole();

    expect($quickReply->manufacturer_id)->toBe($manufacturer->id)
        ->and($quickReply->shortcut)->toBe('catálogo')
        ->and($quickReply->is_active)->toBeTrue();
});

it('does not allow duplicate shortcuts for the same manufacturer', function () {
    [$user, $manufacturer] = createWhatsappQuickReplyContext();
    WhatsappQuickReply::factory()->for($manufacturer)->create([
        'shortcut' => 'catalogo',
    ]);

    $this->actingAs($user)
        ->post('/manufacturer/atendimento/mensagens-rapidas', [
            'shortcut' => '{catalogo}',
            'title' => 'Outro catálogo',
            'body' => 'Outra mensagem.',
            'is_active' => true,
        ])
        ->assertSessionHasErrors('shortcut');

    expect(WhatsappQuickReply::query()->count())->toBe(1);
});

it('updates and pauses a quick reply', function () {
    [$user, $manufacturer] = createWhatsappQuickReplyContext();
    $quickReply = WhatsappQuickReply::factory()->for($manufacturer)->create();

    $this->actingAs($user)
        ->put("/manufacturer/atendimento/mensagens-rapidas/{$quickReply->id}", [
            'shortcut' => 'prazo',
            'title' => 'Prazo de produção',
            'body' => 'Nosso prazo atual é de 30 a 45 dias.',
            'is_active' => false,
        ])
        ->assertRedirect();

    $quickReply->refresh();

    expect($quickReply->shortcut)->toBe('prazo')
        ->and($quickReply->body)->toContain('30 a 45 dias')
        ->and($quickReply->is_active)->toBeFalse();
});

it('forbids changing or deleting another manufacturer quick reply', function () {
    [$user] = createWhatsappQuickReplyContext();
    $foreignQuickReply = WhatsappQuickReply::factory()->create();

    $this->actingAs($user)
        ->put("/manufacturer/atendimento/mensagens-rapidas/{$foreignQuickReply->id}", [
            'shortcut' => 'externa',
            'title' => 'Mensagem externa',
            'body' => 'Não deveria atualizar.',
            'is_active' => true,
        ])
        ->assertForbidden();

    $this->actingAs($user)
        ->delete("/manufacturer/atendimento/mensagens-rapidas/{$foreignQuickReply->id}")
        ->assertForbidden();
});

it('shares only active quick replies with the Chat', function () {
    $this->withoutVite();
    [$user, $manufacturer] = createWhatsappQuickReplyContext();
    WhatsappQuickReply::factory()->for($manufacturer)->create([
        'shortcut' => 'catalogo',
        'is_active' => true,
    ]);
    WhatsappQuickReply::factory()->for($manufacturer)->create([
        'shortcut' => 'pausada',
        'is_active' => false,
    ]);

    $this->actingAs($user)
        ->get('/manufacturer/atendimento')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('manufacturer/atendimento/index')
            ->has('quick_replies', 1)
            ->where('quick_replies.0.shortcut', 'catalogo')
        );
});

it('redirects guests away from quick replies', function () {
    $this->get('/manufacturer/atendimento/mensagens-rapidas')
        ->assertRedirect(route('login'));
});
