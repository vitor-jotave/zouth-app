<?php

use App\Jobs\ProcessWhatsappFunnelStep;
use App\Models\Manufacturer;
use App\Models\User;
use App\Models\WhatsappAutomation;
use App\Models\WhatsappConversation;
use App\Models\WhatsappFunnel;
use App\Models\WhatsappFunnelRun;
use App\Models\WhatsappFunnelStep;
use App\Models\WhatsappInstance;
use App\Models\WhatsappMessage;
use App\Services\WhatsappAutomationRunner;
use Illuminate\Support\Facades\Queue;

function createWhatsappAutomationContext(): array
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

it('shows the automation overview with only the current manufacturer flows', function () {
    $this->withoutVite();
    [$user, $manufacturer] = createWhatsappAutomationContext();
    $funnel = WhatsappFunnel::factory()->forManufacturer($manufacturer)->create([
        'name' => 'Apresentar coleção',
        'code' => 'COLECAO-01',
        'is_active' => true,
    ]);
    $automation = WhatsappAutomation::factory()->for($manufacturer)->create([
        'name' => 'Interesse em produto',
        'definition' => WhatsappAutomation::starterDefinition($funnel->id),
    ]);
    WhatsappAutomation::factory()->create(['name' => 'Outra marca']);

    $this->actingAs($user)
        ->get('/manufacturer/atendimento/automacoes')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('manufacturer/atendimento/automacoes/index')
            ->has('automations', 1)
            ->where('automations.0.id', $automation->id)
            ->where('automations.0.definition.nodes.1.data.keywords.0', 'produto')
            ->where('starter_definition.nodes.2.data.funnel_id', $funnel->id)
        );
});

it('opens the visual builder only from an automation internal route', function () {
    $this->withoutVite();
    [$user, $manufacturer] = createWhatsappAutomationContext();
    $funnel = WhatsappFunnel::factory()->forManufacturer($manufacturer)->create([
        'name' => 'Apresentar coleção',
        'code' => 'COLECAO-01',
        'is_active' => true,
    ]);
    $automation = WhatsappAutomation::factory()->for($manufacturer)->create([
        'name' => 'Interesse em produto',
        'definition' => WhatsappAutomation::starterDefinition($funnel->id),
    ]);

    $this->actingAs($user)
        ->get("/manufacturer/atendimento/automacoes/{$automation->id}/edit")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('manufacturer/atendimento/automacoes/edit')
            ->where('automation.id', $automation->id)
            ->where('automation.definition.nodes.1.data.keywords.0', 'produto')
            ->where('funnels.0.name', 'Apresentar coleção')
        );
});

it('creates an automation as a safe draft', function () {
    [$user, $manufacturer] = createWhatsappAutomationContext();
    $definition = WhatsappAutomation::starterDefinition();
    $definition['nodes'][1]['data']['keywords'][] = 'atacado';

    $response = $this->actingAs($user)
        ->post('/manufacturer/atendimento/automacoes', [
            'name' => 'Lojista pediu preço',
            'definition' => $definition,
        ]);

    $automation = WhatsappAutomation::query()->sole();
    $response->assertRedirect(
        route('manufacturer.atendimento.automations.edit', $automation),
    );

    expect($automation->manufacturer_id)->toBe($manufacturer->id)
        ->and($automation->is_active)->toBeFalse()
        ->and($automation->definition['nodes'])->toHaveCount(4)
        ->and($automation->definition['nodes'][1]['data']['keywords'])
        ->toContain('atacado');
});

it('updates and activates an automation owned by the current manufacturer', function () {
    [$user, $manufacturer] = createWhatsappAutomationContext();
    $automation = WhatsappAutomation::factory()->for($manufacturer)->create();
    $definition = WhatsappAutomation::starterDefinition();
    $definition['nodes'][1]['data']['keywords'] = ['atacado', 'coleção'];

    $this->actingAs($user)
        ->put("/manufacturer/atendimento/automacoes/{$automation->id}", [
            'name' => 'Interesse no atacado',
            'is_active' => true,
            'definition' => $definition,
        ])
        ->assertRedirect();

    $automation->refresh();

    expect($automation->name)->toBe('Interesse no atacado')
        ->and($automation->is_active)->toBeTrue()
        ->and($automation->last_activated_at)->not->toBeNull()
        ->and($automation->definition['nodes'][1]['data']['keywords'])
        ->toBe(['atacado', 'coleção']);
});

it('forbids changing an automation from another manufacturer', function () {
    [$user] = createWhatsappAutomationContext();
    $foreignAutomation = WhatsappAutomation::factory()->create();

    $this->actingAs($user)
        ->put("/manufacturer/atendimento/automacoes/{$foreignAutomation->id}", [
            'name' => 'Automação externa',
            'is_active' => true,
            'definition' => WhatsappAutomation::starterDefinition(),
        ])
        ->assertForbidden();

    $this->actingAs($user)
        ->get("/manufacturer/atendimento/automacoes/{$foreignAutomation->id}/edit")
        ->assertForbidden();
});

it('starts the chosen funnel when an incoming message matches the active flow', function () {
    Queue::fake();
    [, $manufacturer] = createWhatsappAutomationContext();
    $instance = WhatsappInstance::factory()->connected()->create([
        'manufacturer_id' => $manufacturer->id,
    ]);
    $conversation = WhatsappConversation::factory()->create([
        'whatsapp_instance_id' => $instance->id,
    ]);
    $funnel = WhatsappFunnel::factory()->forManufacturer($manufacturer)->create([
        'is_active' => true,
    ]);
    WhatsappFunnelStep::factory()->forFunnel($funnel)->create([
        'type' => 'text',
        'sort_order' => 1,
        'payload' => ['body' => 'Posso te mostrar a coleção?'],
    ]);
    WhatsappAutomation::factory()->for($manufacturer)->active()->create([
        'definition' => WhatsappAutomation::starterDefinition($funnel->id),
    ]);
    $message = WhatsappMessage::factory()->create([
        'whatsapp_conversation_id' => $conversation->id,
        'body' => 'Quero saber o PREÇO desta coleção',
        'from_me' => false,
    ]);

    app(WhatsappAutomationRunner::class)->runForIncomingMessage($message);

    expect(WhatsappFunnelRun::query()->count())->toBe(1)
        ->and(WhatsappFunnelRun::query()->sole()->whatsapp_conversation_id)
        ->toBe($conversation->id);
    Queue::assertPushed(ProcessWhatsappFunnelStep::class);
});

it('keeps the flow quiet when the incoming message does not match', function () {
    Queue::fake();
    [, $manufacturer] = createWhatsappAutomationContext();
    $instance = WhatsappInstance::factory()->connected()->create([
        'manufacturer_id' => $manufacturer->id,
    ]);
    $conversation = WhatsappConversation::factory()->create([
        'whatsapp_instance_id' => $instance->id,
    ]);
    $funnel = WhatsappFunnel::factory()->forManufacturer($manufacturer)->create();
    WhatsappFunnelStep::factory()->forFunnel($funnel)->create();
    WhatsappAutomation::factory()->for($manufacturer)->active()->create([
        'definition' => WhatsappAutomation::starterDefinition($funnel->id),
    ]);
    $message = WhatsappMessage::factory()->create([
        'whatsapp_conversation_id' => $conversation->id,
        'body' => 'Bom dia',
        'from_me' => false,
    ]);

    app(WhatsappAutomationRunner::class)->runForIncomingMessage($message);

    expect(WhatsappFunnelRun::query()->count())->toBe(0);
    Queue::assertNothingPushed();
});

it('redirects guests away from automations', function () {
    $this->get('/manufacturer/atendimento/automacoes')
        ->assertRedirect(route('login'));
});
