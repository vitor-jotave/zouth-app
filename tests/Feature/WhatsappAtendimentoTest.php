<?php

use App\Models\Manufacturer;
use App\Models\User;
use App\Models\WhatsappConversation;
use App\Models\WhatsappInstance;
use App\Models\WhatsappMessage;
use App\Services\EvolutionApiService;

function createWhatsappTestManufacturer(): array
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

// ─── Instance Setup ──────────────────────────────────────────────

test('setup page renders for manufacturer user', function () {
    $this->withoutVite();
    [$user] = createWhatsappTestManufacturer();

    $this->actingAs($user)
        ->get('/manufacturer/atendimento/setup')
        ->assertOk();
});

test('unauthenticated users cannot access setup', function () {
    $this->get('/manufacturer/atendimento/setup')
        ->assertRedirect(route('login'));
});

test('manufacturer user can create an instance', function () {
    [$user, $manufacturer] = createWhatsappTestManufacturer();

    $mock = $this->mock(EvolutionApiService::class);
    $mock->shouldReceive('createInstance')
        ->once()
        ->andReturn(new \Illuminate\Http\Client\Response(
            new \GuzzleHttp\Psr7\Response(200, [], json_encode([
                'instance' => [
                    'instanceName' => 'test-instance',
                    'instanceId' => 'abc-123',
                    'status' => 'created',
                ],
            ]))
        ));

    $this->actingAs($user)
        ->post('/manufacturer/atendimento/instances', [
            'instance_name' => 'test-instance',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('whatsapp_instances', [
        'manufacturer_id' => $manufacturer->id,
        'instance_name' => 'test-instance',
        'status' => 'connecting',
    ]);
});

test('cannot create duplicate instance for same manufacturer', function () {
    [$user, $manufacturer] = createWhatsappTestManufacturer();

    WhatsappInstance::factory()->create(['manufacturer_id' => $manufacturer->id]);

    $this->actingAs($user)
        ->post('/manufacturer/atendimento/instances', [
            'instance_name' => 'second-instance',
        ])
        ->assertRedirect();

    expect(WhatsappInstance::where('manufacturer_id', $manufacturer->id)->count())->toBe(1);
});

test('instance name must be unique', function () {
    [$user] = createWhatsappTestManufacturer();

    WhatsappInstance::factory()->create(['instance_name' => 'taken-name']);

    $this->actingAs($user)
        ->post('/manufacturer/atendimento/instances', [
            'instance_name' => 'taken-name',
        ])
        ->assertSessionHasErrors('instance_name');
});

test('manufacturer user can delete their instance', function () {
    [$user, $manufacturer] = createWhatsappTestManufacturer();
    $instance = WhatsappInstance::factory()->create(['manufacturer_id' => $manufacturer->id]);

    $mock = $this->mock(EvolutionApiService::class);
    $mock->shouldReceive('logoutInstance')->once()->andReturn(
        new \Illuminate\Http\Client\Response(new \GuzzleHttp\Psr7\Response(200))
    );
    $mock->shouldReceive('deleteInstance')->once()->andReturn(
        new \Illuminate\Http\Client\Response(new \GuzzleHttp\Psr7\Response(200))
    );

    $this->actingAs($user)
        ->delete("/manufacturer/atendimento/instances/{$instance->id}")
        ->assertRedirect();

    $this->assertDatabaseMissing('whatsapp_instances', ['id' => $instance->id]);
});

test('user cannot delete another manufacturer instance', function () {
    [$user] = createWhatsappTestManufacturer();

    $otherManufacturer = Manufacturer::factory()->create(['is_active' => true]);
    $instance = WhatsappInstance::factory()->create(['manufacturer_id' => $otherManufacturer->id]);

    $this->actingAs($user)
        ->delete("/manufacturer/atendimento/instances/{$instance->id}")
        ->assertForbidden();
});

// ─── Chat Interface ──────────────────────────────────────────────

test('chat page renders with connected instance', function () {
    $this->withoutVite();
    [$user, $manufacturer] = createWhatsappTestManufacturer();
    WhatsappInstance::factory()->connected()->create(['manufacturer_id' => $manufacturer->id]);

    $this->actingAs($user)
        ->get('/manufacturer/atendimento')
        ->assertOk();
});

test('chat page shows not-connected state when no instance', function () {
    $this->withoutVite();
    [$user] = createWhatsappTestManufacturer();

    $this->actingAs($user)
        ->get('/manufacturer/atendimento')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('manufacturer/atendimento/index')
            ->where('instance_connected', false)
        );
});

test('conversation list endpoint returns json', function () {
    [$user, $manufacturer] = createWhatsappTestManufacturer();
    $instance = WhatsappInstance::factory()->connected()->create(['manufacturer_id' => $manufacturer->id]);

    WhatsappConversation::factory()->count(3)->create(['whatsapp_instance_id' => $instance->id]);

    $this->actingAs($user)
        ->getJson('/manufacturer/atendimento/conversations/list')
        ->assertOk()
        ->assertJsonCount(3, 'conversations');
});

test('messages endpoint returns conversation messages', function () {
    [$user, $manufacturer] = createWhatsappTestManufacturer();
    $instance = WhatsappInstance::factory()->connected()->create(['manufacturer_id' => $manufacturer->id]);
    $conversation = WhatsappConversation::factory()->create(['whatsapp_instance_id' => $instance->id]);

    WhatsappMessage::factory()->count(5)->create(['whatsapp_conversation_id' => $conversation->id]);

    $this->actingAs($user)
        ->getJson("/manufacturer/atendimento/conversations/{$conversation->id}/messages")
        ->assertOk()
        ->assertJsonCount(5, 'messages');
});

test('user cannot read messages from another manufacturer conversation', function () {
    [$user] = createWhatsappTestManufacturer();

    $otherManufacturer = Manufacturer::factory()->create(['is_active' => true]);
    $instance = WhatsappInstance::factory()->connected()->create(['manufacturer_id' => $otherManufacturer->id]);
    $conversation = WhatsappConversation::factory()->create(['whatsapp_instance_id' => $instance->id]);

    $this->actingAs($user)
        ->getJson("/manufacturer/atendimento/conversations/{$conversation->id}/messages")
        ->assertForbidden();
});

test('sending a message calls evolution api and stores locally', function () {
    [$user, $manufacturer] = createWhatsappTestManufacturer();
    $instance = WhatsappInstance::factory()->connected()->create(['manufacturer_id' => $manufacturer->id]);
    $conversation = WhatsappConversation::factory()->create(['whatsapp_instance_id' => $instance->id]);

    $mock = $this->mock(EvolutionApiService::class);
    $mock->shouldReceive('sendText')
        ->once()
        ->andReturn(new \Illuminate\Http\Client\Response(
            new \GuzzleHttp\Psr7\Response(200, [], json_encode([
                'key' => ['id' => 'msg-123'],
            ]))
        ));

    $this->actingAs($user)
        ->postJson("/manufacturer/atendimento/conversations/{$conversation->id}/messages", [
            'body' => 'Olá, tudo bem?',
        ])
        ->assertOk()
        ->assertJsonPath('message.body', 'Olá, tudo bem?')
        ->assertJsonPath('message.from_me', true);

    $this->assertDatabaseHas('whatsapp_messages', [
        'whatsapp_conversation_id' => $conversation->id,
        'message_id' => 'msg-123',
        'body' => 'Olá, tudo bem?',
        'from_me' => true,
    ]);
});

test('sending a message requires body', function () {
    [$user, $manufacturer] = createWhatsappTestManufacturer();
    $instance = WhatsappInstance::factory()->connected()->create(['manufacturer_id' => $manufacturer->id]);
    $conversation = WhatsappConversation::factory()->create(['whatsapp_instance_id' => $instance->id]);

    $this->actingAs($user)
        ->postJson("/manufacturer/atendimento/conversations/{$conversation->id}/messages", [
            'body' => '',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('body');
});

// ─── Webhook ─────────────────────────────────────────────────────

test('webhook creates conversation and message on messages.upsert', function () {
    $instance = WhatsappInstance::factory()->connected()->create();

    $payload = [
        'event' => 'messages.upsert',
        'data' => [
            'key' => [
                'id' => 'webhook-msg-001',
                'remoteJid' => '5511999887766@s.whatsapp.net',
                'fromMe' => false,
            ],
            'pushName' => 'João',
            'message' => [
                'conversation' => 'Oi, preciso de ajuda!',
            ],
            'messageTimestamp' => now()->timestamp,
        ],
    ];

    $this->postJson("/webhooks/evolution/{$instance->instance_name}", $payload, [
        'apikey' => config('evolution.api_key'),
    ])->assertOk();

    $this->assertDatabaseHas('whatsapp_conversations', [
        'whatsapp_instance_id' => $instance->id,
        'remote_jid' => '5511999887766@s.whatsapp.net',
        'contact_name' => 'João',
    ]);

    $this->assertDatabaseHas('whatsapp_messages', [
        'message_id' => 'webhook-msg-001',
        'body' => 'Oi, preciso de ajuda!',
        'from_me' => false,
    ]);
});

test('webhook rejects invalid api key', function () {
    $instance = WhatsappInstance::factory()->connected()->create();

    $this->postJson("/webhooks/evolution/{$instance->instance_name}", [
        'event' => 'messages.upsert',
    ], [
        'apikey' => 'wrong-key',
    ])->assertUnauthorized();
});

test('webhook updates connection status', function () {
    $instance = WhatsappInstance::factory()->create(['status' => 'connecting']);

    $this->postJson("/webhooks/evolution/{$instance->instance_name}", [
        'event' => 'connection.update',
        'data' => [
            'state' => 'open',
        ],
    ], [
        'apikey' => config('evolution.api_key'),
    ])->assertOk();

    expect($instance->fresh()->status->value)->toBe('connected');
});

test('webhook updates message status', function () {
    $instance = WhatsappInstance::factory()->connected()->create();
    $conversation = WhatsappConversation::factory()->create(['whatsapp_instance_id' => $instance->id]);
    $message = WhatsappMessage::factory()->fromMe()->create([
        'whatsapp_conversation_id' => $conversation->id,
        'message_id' => 'msg-update-001',
        'status' => 'sent',
    ]);

    $this->postJson("/webhooks/evolution/{$instance->instance_name}", [
        'event' => 'messages.update',
        'data' => [
            'key' => ['id' => 'msg-update-001'],
            'status' => 'READ',
        ],
    ], [
        'apikey' => config('evolution.api_key'),
    ])->assertOk();

    expect($message->fresh()->status->value)->toBe('read');
});

test('webhook ignores status broadcast messages', function () {
    $instance = WhatsappInstance::factory()->connected()->create();

    $this->postJson("/webhooks/evolution/{$instance->instance_name}", [
        'event' => 'messages.upsert',
        'data' => [
            'key' => [
                'id' => 'broadcast-msg',
                'remoteJid' => 'status@broadcast',
                'fromMe' => false,
            ],
            'message' => ['conversation' => 'Status update'],
            'messageTimestamp' => now()->timestamp,
        ],
    ], [
        'apikey' => config('evolution.api_key'),
    ])->assertOk();

    $this->assertDatabaseMissing('whatsapp_messages', ['message_id' => 'broadcast-msg']);
});

test('webhook increments unread count for incoming messages', function () {
    $instance = WhatsappInstance::factory()->connected()->create();
    $conversation = WhatsappConversation::factory()->create([
        'whatsapp_instance_id' => $instance->id,
        'remote_jid' => '5511888776655@s.whatsapp.net',
        'unread_count' => 2,
    ]);

    $this->postJson("/webhooks/evolution/{$instance->instance_name}", [
        'event' => 'messages.upsert',
        'data' => [
            'key' => [
                'id' => 'unread-msg-001',
                'remoteJid' => '5511888776655@s.whatsapp.net',
                'fromMe' => false,
            ],
            'message' => ['conversation' => 'Nova mensagem'],
            'messageTimestamp' => now()->timestamp,
        ],
    ], [
        'apikey' => config('evolution.api_key'),
    ])->assertOk();

    expect($conversation->fresh()->unread_count)->toBe(3);
});

test('opening a conversation resets unread count', function () {
    $this->withoutVite();
    [$user, $manufacturer] = createWhatsappTestManufacturer();
    $instance = WhatsappInstance::factory()->connected()->create(['manufacturer_id' => $manufacturer->id]);
    $conversation = WhatsappConversation::factory()->create([
        'whatsapp_instance_id' => $instance->id,
        'unread_count' => 5,
    ]);

    $this->actingAs($user)
        ->get("/manufacturer/atendimento?conversation={$conversation->id}")
        ->assertOk();

    expect($conversation->fresh()->unread_count)->toBe(0);
});
